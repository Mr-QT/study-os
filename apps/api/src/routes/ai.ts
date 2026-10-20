import type { FastifyPluginAsync } from "fastify";

import { eq } from "drizzle-orm";

import {
  aiErrorCodes,
  aiRequestInputSchema,
  aiRequestResponseSchema,
  aiStatusResponseSchema,
  aiUsageResponseSchema,
  apiErrorCodes,
} from "@study-os/contracts";
import { aiInvocations, spaces } from "@study-os/db";

import { AiProviderError, type AiMessage, type AiProvider } from "../ai/provider";
import { estimateCostMicros, monthlyCalls, monthlySpendMicros } from "../ai/usage";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";

export interface AiRouteOptions {
  provider: AiProvider | null;
  budgetUsd: number;
  costPer1kUsd: number;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  study_plan:
    "你是 Study OS 的学习规划助手。基于用户给出的目标和约束，输出可执行的学习计划与任务拆分。" +
    "用中文回答，结构清晰；不要虚构课程、成绩或事实；明确说明这是建议，写入系统前需要用户确认。",
  explain:
    "你是 Study OS 的学习导师。用简明中文解释概念，给出例子，并指出不确定之处；不要编造引用来源。",
};

export const aiRoutes: FastifyPluginAsync<AiRouteOptions> = async (app, options) => {
  app.get("/api/v1/ai/status", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const spentUsd = (await monthlySpendMicros(database.db, user.id)) / 1_000_000;
    const budgetUsd = options.budgetUsd;
    return aiStatusResponseSchema.parse({
      enabled: options.provider !== null,
      provider: options.provider?.name ?? "disabled",
      model: options.provider?.model ?? "none",
      budgetUsd,
      spentUsd,
      remainingUsd: Math.max(0, budgetUsd - spentUsd),
    });
  });

  app.get("/api/v1/ai/usage", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    return aiUsageResponseSchema.parse({
      budgetUsd: options.budgetUsd,
      spentUsd: (await monthlySpendMicros(database.db, user.id)) / 1_000_000,
      calls: await monthlyCalls(database.db, user.id),
    });
  });

  app.post("/api/v1/ai/requests", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = aiRequestInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    if (!options.provider) {
      return sendError(
        reply,
        503,
        apiErrorCodes.serviceUnavailable,
        "AI 未配置：请设置 AI_PROVIDER 与 AI_API_KEY（或本地 Ollama）",
      );
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
        "私密空间默认只允许本地模型；请改用本地 Ollama 或调整空间隐私级别",
      );
    }

    const spentMicros = await monthlySpendMicros(database.db, user.id);
    const budgetMicros = Math.round(options.budgetUsd * 1_000_000);
    if (spentMicros >= budgetMicros) {
      return sendError(
        reply,
        402,
        aiErrorCodes.budgetExceeded,
        "本月 AI 预算已用完；请调整预算或等待下月重置",
        { retryable: false },
      );
    }

    const messages: AiMessage[] = [
      { role: "system", content: SYSTEM_PROMPTS[parsed.data.purpose] ?? SYSTEM_PROMPTS.explain ?? "" },
      { role: "user", content: parsed.data.input },
    ];

    try {
      const completion = await options.provider.complete(messages);
      const costMicros = estimateCostMicros(
        completion.promptChars,
        completion.completionChars,
        options.costPer1kUsd,
      );
      const [invocation] = await database.db
        .insert(aiInvocations)
        .values({
          userId: user.id,
          spaceId: parsed.data.spaceId,
          purpose: parsed.data.purpose,
          provider: completion.provider,
          model: completion.model,
          promptChars: completion.promptChars,
          completionChars: completion.completionChars,
          estimatedCostMicros: costMicros,
          status: "ok",
        })
        .returning();
      if (!invocation) return reply;

      return aiRequestResponseSchema.parse({
        invocationId: invocation.id,
        text: completion.text,
        provider: completion.provider,
        model: completion.model,
        usage: {
          promptChars: completion.promptChars,
          completionChars: completion.completionChars,
        },
      });
    } catch (error) {
      const code = error instanceof AiProviderError ? error.code : "AI_PROVIDER_ERROR";
      await database.db.insert(aiInvocations).values({
        userId: user.id,
        spaceId: parsed.data.spaceId,
        purpose: parsed.data.purpose,
        provider: options.provider.name,
        model: options.provider.model,
        promptChars: 0,
        completionChars: 0,
        estimatedCostMicros: 0,
        status: "error",
        errorCode: code,
      });
      return sendError(reply, 502, code, "AI 服务暂时不可用，请稍后重试", { retryable: true });
    }
  });
};
