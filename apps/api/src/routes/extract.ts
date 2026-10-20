import type { FastifyPluginAsync } from "fastify";

import { eq } from "drizzle-orm";

import {
  aiErrorCodes,
  apiErrorCodes,
  extractMemoriesInputSchema,
  extractMemoriesResponseSchema,
  memorySchema,
} from "@study-os/contracts";
import { aiInvocations, aiMemories, spaces } from "@study-os/db";

import { type AiMessage, type AiProvider } from "../ai/provider";
import { estimateCostMicros, monthlySpendMicros } from "../ai/usage";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";

export interface ExtractRouteOptions {
  provider: AiProvider | null;
  budgetUsd: number;
  costPer1kUsd: number;
}

interface DraftMemory {
  content: string;
  kind: "fact" | "preference" | "inference";
  confidence: number;
}

function parseMemories(text: string): DraftMemory[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(["fact", "preference", "inference"]);
    return parsed
      .filter(
        (item): item is { content: string; kind?: string; confidence?: number } =>
          typeof item === "object" && item !== null && typeof (item as { content?: unknown }).content === "string",
      )
      .slice(0, 5)
      .map((item) => ({
        content: item.content.slice(0, 500),
        kind: allowed.has(item.kind ?? "") ? (item.kind as DraftMemory["kind"]) : "fact",
        confidence:
          typeof item.confidence === "number"
            ? Math.min(100, Math.max(0, Math.round(item.confidence)))
            : 70,
      }));
  } catch {
    return [];
  }
}

export const extractRoutes: FastifyPluginAsync<ExtractRouteOptions> = async (app, options) => {
  app.post("/api/v1/memories/extract", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = extractMemoriesInputSchema.safeParse(request.body);
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
          "从学习对话中提取值得长期记住的学习者事实或偏好，只输出 JSON 数组：" +
          '[{"content":"...","kind":"fact|preference|inference","confidence":0-100}]。' +
          "不要提取隐私敏感信息，最多 5 条。",
      },
      { role: "user", content: parsed.data.text },
    ];

    try {
      const completion = await options.provider.complete(messages);
      const drafts = parseMemories(completion.text);
      const inserted = drafts.length
        ? await database.db
            .insert(aiMemories)
            .values(
              drafts.map((draft) => ({
                userId: user.id,
                spaceId: parsed.data.spaceId,
                scope: "space" as const,
                kind: draft.kind,
                content: draft.content,
                source: "ai_extraction",
                confidence: draft.confidence,
              })),
            )
            .returning()
        : [];

      await database.db.insert(aiInvocations).values({
        userId: user.id,
        spaceId: parsed.data.spaceId,
        purpose: "agent:memory_extractor",
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

      return extractMemoriesResponseSchema.parse({
        memories: inserted.map((row) =>
          memorySchema.parse({
            id: row.id,
            scope: row.scope,
            kind: row.kind,
            content: row.content,
            source: row.source,
            confidence: row.confidence,
            pinned: row.pinned,
            disabled: row.disabled,
            expiresAt: row.expiresAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          }),
        ),
      });
    } catch {
      return sendError(reply, 502, "AI_PROVIDER_ERROR", "AI 服务暂时不可用", { retryable: true });
    }
  });
};
