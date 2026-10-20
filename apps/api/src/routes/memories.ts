import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import {
  createMemoryInputSchema,
  idParamSchema,
  memoryListResponseSchema,
  memoryResponseSchema,
  spaceQuerySchema,
  updateMemoryInputSchema,
  type MemoryDto,
} from "@study-os/contracts";
import { aiMemories, type AiMemoryRow } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

function toMemoryDto(row: AiMemoryRow): MemoryDto {
  return {
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
  };
}

export const memoryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/memories", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select()
      .from(aiMemories)
      .where(
        and(
          eq(aiMemories.userId, user.id),
          or(eq(aiMemories.spaceId, query.data.spaceId), isNull(aiMemories.spaceId)),
        ),
      )
      .orderBy(desc(aiMemories.updatedAt));
    return memoryListResponseSchema.parse({ memories: rows.map(toMemoryDto) });
  });

  app.post("/api/v1/memories", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createMemoryInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if (parsed.data.spaceId) {
      if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
        return notFound(reply);
      }
    }

    const [memory] = await database.db
      .insert(aiMemories)
      .values({
        userId: user.id,
        spaceId: parsed.data.spaceId ?? null,
        courseId: parsed.data.courseId ?? null,
        scope: parsed.data.scope ?? (parsed.data.spaceId ? "space" : "user"),
        kind: parsed.data.kind ?? "fact",
        content: parsed.data.content,
        confidence: parsed.data.confidence ?? 80,
        pinned: parsed.data.pinned ?? false,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning();
    if (!memory) return reply;
    return reply.code(201).send(memoryResponseSchema.parse({ memory: toMemoryDto(memory) }));
  });

  app.patch("/api/v1/memories/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateMemoryInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(aiMemories)
      .where(and(eq(aiMemories.id, params.data.id), eq(aiMemories.userId, user.id)))
      .limit(1);
    if (!existing) return notFound(reply);

    const [updated] = await database.db
      .update(aiMemories)
      .set({
        ...(parsed.data.content === undefined ? {} : { content: parsed.data.content }),
        ...(parsed.data.kind === undefined ? {} : { kind: parsed.data.kind }),
        ...(parsed.data.confidence === undefined ? {} : { confidence: parsed.data.confidence }),
        ...(parsed.data.pinned === undefined ? {} : { pinned: parsed.data.pinned }),
        ...(parsed.data.disabled === undefined ? {} : { disabled: parsed.data.disabled }),
        updatedAt: new Date(),
      })
      .where(eq(aiMemories.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    return memoryResponseSchema.parse({ memory: toMemoryDto(updated) });
  });

  app.delete("/api/v1/memories/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const deleted = await database.db
      .delete(aiMemories)
      .where(and(eq(aiMemories.id, params.data.id), eq(aiMemories.userId, user.id)))
      .returning();
    if (deleted.length === 0) return notFound(reply);
    return reply.code(204).send();
  });
};
