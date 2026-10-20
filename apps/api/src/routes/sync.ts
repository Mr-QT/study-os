import type { FastifyPluginAsync } from "fastify";

import { and, asc, eq, gt, isNull } from "drizzle-orm";

import {
  spaceQuerySchema,
  syncPullResponseSchema,
  syncPushInputSchema,
  syncPushResultSchema,
  updateNoteInputSchema,
  updateTaskInputSchema,
} from "@study-os/contracts";
import { notes, syncChanges, tasks } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";
import { recordChange } from "../sync/record";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export const syncRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/sync/pull", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    const raw = request.query as { cursor?: string; limit?: string };
    const cursor = raw.cursor ? Number(raw.cursor) : 0;
    const limit = raw.limit ? Math.min(Number(raw.limit), MAX_LIMIT) : DEFAULT_LIMIT;
    if (!Number.isInteger(cursor) || cursor < 0 || !Number.isInteger(limit) || limit < 1) {
      return validationError(reply, { message: "cursor/limit 不合法" });
    }

    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    const rows = await database.db
      .select()
      .from(syncChanges)
      .where(and(eq(syncChanges.spaceId, query.data.spaceId), gt(syncChanges.id, cursor)))
      .orderBy(asc(syncChanges.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return syncPullResponseSchema.parse({
      changes: page.map((row) => ({
        cursor: row.id,
        entityType: row.entityType as "task" | "note",
        entityId: row.entityId,
        operation: row.operation,
        version: row.version,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: last?.id ?? cursor,
      hasMore,
    });
  });

  app.post("/api/v1/sync/push", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = syncPushInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true);
    if (access !== "ok") return notFound(reply);

    const results: Array<{
      opId: string;
      status: "accepted" | "conflict" | "rejected";
      version?: number;
      reason?: string;
    }> = [];

    for (const operation of parsed.data.operations) {
      try {
        if (operation.entityType === "task") {
          const [task] = await database.db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.id, operation.entityId),
                eq(tasks.spaceId, parsed.data.spaceId),
                isNull(tasks.deletedAt),
              ),
            )
            .limit(1);
          if (!task) {
            results.push({ opId: operation.opId, status: "rejected", reason: "not_found" });
            continue;
          }
          if (operation.baseVersion && operation.baseVersion !== task.version) {
            results.push({
              opId: operation.opId,
              status: "conflict",
              version: task.version,
              reason: "version_mismatch",
            });
            continue;
          }

          if (operation.action === "delete") {
            await database.db
              .update(tasks)
              .set({ deletedAt: new Date(), updatedAt: new Date(), version: task.version + 1 })
              .where(eq(tasks.id, task.id));
            await recordChange(database.db, {
              userId: user.id,
              spaceId: task.spaceId,
              entityType: "task",
              entityId: task.id,
              operation: "delete",
              version: task.version + 1,
            });
            results.push({ opId: operation.opId, status: "accepted", version: task.version + 1 });
            continue;
          }

          const patch = updateTaskInputSchema.safeParse(operation.patch);
          if (!patch.success) {
            results.push({ opId: operation.opId, status: "rejected", reason: "invalid_patch" });
            continue;
          }
          const changes = patch.data;
          const [updated] = await database.db
            .update(tasks)
            .set({
              ...(changes.title === undefined ? {} : { title: changes.title }),
              ...(changes.notes === undefined ? {} : { notes: changes.notes }),
              ...(changes.status === undefined ? {} : { status: changes.status }),
              ...(changes.priority === undefined ? {} : { priority: changes.priority }),
              ...(changes.courseId === undefined ? {} : { courseId: changes.courseId }),
              ...(changes.dueAt === undefined
                ? {}
                : { dueAt: changes.dueAt === null ? null : new Date(changes.dueAt) }),
              ...(changes.estimateMinutes === undefined
                ? {}
                : { estimateMinutes: changes.estimateMinutes }),
              version: task.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, task.id))
            .returning();
          if (!updated) {
            results.push({ opId: operation.opId, status: "rejected", reason: "update_failed" });
            continue;
          }
          await recordChange(database.db, {
            userId: user.id,
            spaceId: updated.spaceId,
            entityType: "task",
            entityId: updated.id,
            operation: "update",
            version: updated.version,
          });
          results.push({ opId: operation.opId, status: "accepted", version: updated.version });
          continue;
        }

        const [note] = await database.db
          .select()
          .from(notes)
          .where(
            and(
              eq(notes.id, operation.entityId),
              eq(notes.spaceId, parsed.data.spaceId),
              isNull(notes.deletedAt),
            ),
          )
          .limit(1);
        if (!note) {
          results.push({ opId: operation.opId, status: "rejected", reason: "not_found" });
          continue;
        }
        if (operation.baseVersion && operation.baseVersion !== note.version) {
          results.push({
            opId: operation.opId,
            status: "conflict",
            version: note.version,
            reason: "version_mismatch",
          });
          continue;
        }

        if (operation.action === "delete") {
          await database.db
            .update(notes)
            .set({ deletedAt: new Date(), updatedAt: new Date(), version: note.version + 1 })
            .where(eq(notes.id, note.id));
          await recordChange(database.db, {
            userId: user.id,
            spaceId: note.spaceId,
            entityType: "note",
            entityId: note.id,
            operation: "delete",
            version: note.version + 1,
          });
          results.push({ opId: operation.opId, status: "accepted", version: note.version + 1 });
          continue;
        }

        const patch = updateNoteInputSchema.safeParse(operation.patch);
        if (!patch.success) {
          results.push({ opId: operation.opId, status: "rejected", reason: "invalid_patch" });
          continue;
        }
        const changes = patch.data;
        const [updated] = await database.db
          .update(notes)
          .set({
            ...(changes.title === undefined ? {} : { title: changes.title }),
            ...(changes.contentMd === undefined ? {} : { contentMd: changes.contentMd }),
            ...(changes.courseId === undefined ? {} : { courseId: changes.courseId }),
            version: note.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(notes.id, note.id))
          .returning();
        if (!updated) {
          results.push({ opId: operation.opId, status: "rejected", reason: "update_failed" });
          continue;
        }
        await recordChange(database.db, {
          userId: user.id,
          spaceId: updated.spaceId,
          entityType: "note",
          entityId: updated.id,
          operation: "update",
          version: updated.version,
        });
        results.push({ opId: operation.opId, status: "accepted", version: updated.version });
      } catch {
        results.push({ opId: operation.opId, status: "rejected", reason: "internal_error" });
      }
    }

    return syncPushResultSchema.parse({ results });
  });
};
