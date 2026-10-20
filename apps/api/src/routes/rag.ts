import type { FastifyPluginAsync } from "fastify";

import {
  ragReindexResponseSchema,
  semanticSearchResponseSchema,
  spaceQuerySchema,
} from "@study-os/contracts";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";
import { reindexSpace, semanticSearch } from "../rag";
import type { Embedder } from "../rag/embedder";

export interface RagRouteOptions {
  embedder: Embedder;
}

export const ragRoutes: FastifyPluginAsync<RagRouteOptions> = async (app, options) => {
  app.get("/api/v1/search/semantic", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    const raw = request.query as { q?: string; limit?: string };
    const q = raw.q?.trim() ?? "";
    if (q.length === 0) return validationError(reply, { message: "q 不能为空" });
    const limit = raw.limit ? Math.min(Number(raw.limit), 20) : 8;
    if (!Number.isInteger(limit) || limit < 1) {
      return validationError(reply, { message: "limit 不合法" });
    }
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const results = await semanticSearch(database.db, options.embedder, query.data.spaceId, q, limit);
    return semanticSearchResponseSchema.parse({ results });
  });

  app.post("/api/v1/rag/reindex", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const body = request.body as { spaceId?: string } | undefined;
    const spaceId = body?.spaceId;
    if (!spaceId) return validationError(reply, { message: "缺少 spaceId" });
    if ((await ensureSpaceAccess(database.db, user.id, spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const result = await reindexSpace(database.db, options.embedder, spaceId);
    return ragReindexResponseSchema.parse(result);
  });
};
