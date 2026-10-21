import type { FastifyPluginAsync } from "fastify";

import { eq } from "drizzle-orm";

import {
  aiErrorCodes,
  apiErrorCodes,
  ruleDraftInputSchema,
  ruleDraftResponseSchema,
} from "@study-os/contracts";
import { aiInvocations, spaces } from "@study-os/db";

import { type AiMessage, type AiProvider } from "../ai/provider";
import { estimateCostMicros, monthlySpendMicros } from "../ai/usage";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";

export interface RuleDraftRouteOptions {
  provider: AiProvider | null;
  budgetUsd: number;
  costPer1kUsd: number;
}

function parseDraft(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return ruleDraftResponseSchema.safeParse(parsed).success
      ? ruleDraftResponseSchema.parse(parsed)
      : null;
  } catch {
    return null;
  }
}

export const ruleDraftRoutes: FastifyPluginAsync<RuleDraftRouteOptions> = async (app, options) => {
  app.post("/api/v1/automation/rules/draft", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = ruleDraftInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
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

    const messages: AiMessage[] = [
      {
        role: "system",
        content:
          "把用户描述转换成 Study OS 自动化规则，只输出 JSON：" +
          '{"name":"...","trigger":"task.completed|focus.completed|exam.submitted",' +
          '"conditions":{},"actions":[{"type":"create_notification|create_task","title":"..."}]}。' +
          "条件可为空对象；动作最多 3 个。",
      },
      { role: "user", content: parsed.data.text },
    ];

    try {
      const completion = await options.provider.complete(messages);
      const draft = parseDraft(completion.text);
      await database.db.insert(aiInvocations).values({
        userId: user.id,
        spaceId: parsed.data.spaceId,
        purpose: "agent:automation_drafter",
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
      });
      if (!draft) {
        return sendError(
          reply,
          422,
          "INVALID_DRAFT",
          "模型没有返回合法的规则草案，请换个描述重试",
        );
      }
      return draft;
    } catch {
      return sendError(reply, 502, "AI_PROVIDER_ERROR", "AI 服务暂时不可用", { retryable: true });
    }
  });
};
