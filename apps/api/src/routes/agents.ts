import type { FastifyPluginAsync } from "fastify";

import { and, eq, gt, isNull, or } from "drizzle-orm";

import {
  agentListResponseSchema,
  agentRoleSchema,
  agentRunInputSchema,
  agentRunResponseSchema,
  aiErrorCodes,
  apiErrorCodes,
} from "@study-os/contracts";
import { aiInvocations, aiMemories, questionAttempts, questions, spaces } from "@study-os/db";

import { type AiMessage, type AiProvider } from "../ai/provider";
import { estimateCostMicros, monthlySpendMicros } from "../ai/usage";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";

export interface AgentRouteOptions {
  provider: AiProvider | null;
  budgetUsd: number;
  costPer1kUsd: number;
}

const AGENTS = {
  planner: {
    description: "把学习目标拆成诊断、学习、练习、复盘的可执行步骤",
    prompt:
      "你是 Study OS 的规划 Agent。把用户目标拆成 3–8 个步骤，只输出 JSON：" +
      '{"steps":[{"title":"...","type":"diagnose|study|practice|review"}]}。不要输出其他文字。',
  },
  tutor: {
    description: "苏格拉底式答疑，结合记忆与薄弱点",
    prompt: "你是 Study OS 的导师 Agent。用中文引导思考，不直接给完整答案，不虚构事实。",
  },
  examiner: {
    description: "根据薄弱点出题与讲评",
    prompt: "你是 Study OS 的出题 Agent。针对薄弱点给出 2–3 道练习，并说明考查点，用中文。",
  },
  analyst: {
    description: "解读学习数据并给出改进建议",
    prompt: "你是 Study OS 的分析 Agent。根据学习数据给出简短、可执行的建议，用中文，不夸大预测。",
  },
} as const;

export const agentRoutes: FastifyPluginAsync<AgentRouteOptions> = async (app, options) => {
  app.get("/api/v1/agents", async () => {
    return agentListResponseSchema.parse({
      agents: (Object.keys(AGENTS) as Array<keyof typeof AGENTS>).map((role) => ({
        role,
        description: AGENTS[role].description,
      })),
    });
  });

  app.post("/api/v1/agents/:role/run", async (request, reply) => {
    const role = agentRoleSchema.safeParse((request.params as { role?: string }).role);
    if (!role.success) return notFound(reply);
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = agentRunInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }
    if (!options.provider) {
      return sendError(reply, 503, apiErrorCodes.serviceUnavailable, "AI 未配置");
    }

    const [space] = await database.db
      .select({ privacyLevel: spaces.privacyLevel })
      .from(spaces)
      .where(eq(spaces.id, parsed.data.spaceId))
      .limit(1);
    if (!space) return notFound(reply);
    if (space.privacyLevel === "private_local" && options.provider.name !== "ollama") {
      return sendError(reply, 403, aiErrorCodes.privacyDenied, "私密空间默认只允许本地模型");
    }

    const spent = await monthlySpendMicros(database.db, user.id);
    if (spent >= Math.round(options.budgetUsd * 1_000_000)) {
      return sendError(reply, 402, aiErrorCodes.budgetExceeded, "本月 AI 预算已用完");
    }

    const memories = await database.db
      .select()
      .from(aiMemories)
      .where(
        and(
          eq(aiMemories.userId, user.id),
          eq(aiMemories.disabled, false),
          or(eq(aiMemories.spaceId, parsed.data.spaceId), isNull(aiMemories.spaceId)),
          or(isNull(aiMemories.expiresAt), gt(aiMemories.expiresAt, new Date())),
        ),
      )
      .limit(10);

    const attempts = await database.db
      .select({ attempt: questionAttempts, question: questions })
      .from(questionAttempts)
      .innerJoin(questions, eq(questions.id, questionAttempts.questionId))
      .where(
        and(
          eq(questions.spaceId, parsed.data.spaceId),
          eq(questionAttempts.userId, user.id),
          isNull(questions.deletedAt),
        ),
      );
    const byQuestion = new Map<string, { prompt: string; attempts: number; correct: number }>();
    for (const row of attempts) {
      const bucket =
        byQuestion.get(row.question.id) ??
        { prompt: row.question.prompt, attempts: 0, correct: 0 };
      bucket.attempts += 1;
      if (row.attempt.isCorrect) bucket.correct += 1;
      byQuestion.set(row.question.id, bucket);
    }
    const weak = [...byQuestion.values()]
      .map((bucket) => ({
        prompt: bucket.prompt,
        accuracy: Math.round((bucket.correct / bucket.attempts) * 100),
      }))
      .filter((item) => item.accuracy < 60)
      .slice(0, 3);

    const context = [
      AGENTS[role.data].prompt,
      memories.length > 0
        ? `学习者记忆：\n${memories.map((memory) => `- ${memory.content}`).join("\n")}`
        : "",
      weak.length > 0
        ? `薄弱题：\n${weak.map((item) => `- ${item.prompt}（${item.accuracy}%）`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages: AiMessage[] = [
      { role: "system", content: context },
      { role: "user", content: parsed.data.input },
    ];

    try {
      const completion = await options.provider.complete(messages);
      const [invocation] = await database.db
        .insert(aiInvocations)
        .values({
          userId: user.id,
          spaceId: parsed.data.spaceId,
          purpose: `agent:${role.data}`,
          provider: completion.provider,
          model: completion.model,
          promptChars: completion.promptChars,
          completionChars: completion.completionChars,
          estimatedCostMicros: estimateCostMicros(
            completion.promptChars,
            completion.completionChars,
            options.costPer1kUsd,
          ),
          status: "ok",
        })
        .returning();
      if (!invocation) return reply;
      return agentRunResponseSchema.parse({
        invocationId: invocation.id,
        role: role.data,
        text: completion.text,
        provider: completion.provider,
        model: completion.model,
      });
    } catch {
      return sendError(reply, 502, "AI_PROVIDER_ERROR", "AI 服务暂时不可用", { retryable: true });
    }
  });
};
