import type { FastifyPluginAsync } from "fastify";

import { and, eq, gt, isNull, or } from "drizzle-orm";

import {
  aiErrorCodes,
  apiErrorCodes,
  tutorInputSchema,
  tutorResponseSchema,
} from "@study-os/contracts";
import { aiInvocations, aiMemories, questionAttempts, questions, spaces } from "@study-os/db";

import { AiProviderError, type AiMessage, type AiProvider } from "../ai/provider";
import { estimateCostMicros, monthlySpendMicros } from "../ai/usage";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";

export interface TutorRouteOptions {
  provider: AiProvider | null;
  budgetUsd: number;
  costPer1kUsd: number;
}

export const tutorRoutes: FastifyPluginAsync<TutorRouteOptions> = async (app, options) => {
  app.post("/api/v1/ai/tutor", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = tutorInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

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
      return sendError(
        reply,
        403,
        aiErrorCodes.privacyDenied,
        "私密空间默认只允许本地模型",
      );
    }

    const spentMicros = await monthlySpendMicros(database.db, user.id);
    if (spentMicros >= Math.round(options.budgetUsd * 1_000_000)) {
      return sendError(reply, 402, aiErrorCodes.budgetExceeded, "本月 AI 预算已用完");
    }

    const memoryRows = await database.db
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
      .limit(20);

    const attemptRows = await database.db
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
    for (const row of attemptRows) {
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

    const mode = parsed.data.mode ?? "socratic";
    const system = [
      mode === "socratic"
        ? "你是 Study OS 的苏格拉底式导师：先提问引导，不直接给完整答案；用中文，简洁。"
        : "你是 Study OS 的学习导师：用中文解释概念并给例子，指出不确定之处。",
      "不要虚构事实或引用来源。",
      memoryRows.length > 0
        ? `已知学习者记忆：\n${memoryRows.map((row) => `- ${row.content}`).join("\n")}`
        : "",
      weak.length > 0
        ? `薄弱题目：\n${weak.map((item) => `- ${item.prompt}（正确率 ${item.accuracy}%）`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages: AiMessage[] = [
      { role: "system", content: system },
      { role: "user", content: parsed.data.question },
    ];

    try {
      const completion = await options.provider.complete(messages);
      const [invocation] = await database.db
        .insert(aiInvocations)
        .values({
          userId: user.id,
          spaceId: parsed.data.spaceId,
          purpose: "tutor",
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
      return tutorResponseSchema.parse({
        invocationId: invocation.id,
        text: completion.text,
        provider: completion.provider,
        model: completion.model,
        memoriesUsed: memoryRows.length,
        weakQuestionsUsed: weak.length,
      });
    } catch (error) {
      await database.db.insert(aiInvocations).values({
        userId: user.id,
        spaceId: parsed.data.spaceId,
        purpose: "tutor",
        provider: options.provider.name,
        model: options.provider.model,
        status: "error",
        errorCode: error instanceof AiProviderError ? error.code : "AI_PROVIDER_ERROR",
      });
      return sendError(reply, 502, "AI_PROVIDER_ERROR", "AI 服务暂时不可用", { retryable: true });
    }
  });
};
