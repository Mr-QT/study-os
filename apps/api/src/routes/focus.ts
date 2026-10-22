import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq, isNull } from "drizzle-orm";

import {
  apiErrorCodes,
  focusSessionListResponseSchema,
  focusSessionResponseSchema,
  idParamSchema,
  spaceQuerySchema,
  startFocusInputSchema,
  stopFocusInputSchema,
} from "@study-os/contracts";
import { focusSessions, tasks } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { runAutomations } from "../automation/engine";
import { queueWebhooks } from "../webhooks/dispatch";
import { toFocusSessionDto } from "../dto";
import { notFound, sendError, validationError } from "../http/errors";

export const focusRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/focus/sessions", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    const rows = await database.db
      .select()
      .from(focusSessions)
      .where(
        and(eq(focusSessions.spaceId, query.data.spaceId), eq(focusSessions.userId, user.id)),
      )
      .orderBy(desc(focusSessions.startedAt))
      .limit(100);
    return focusSessionListResponseSchema.parse({ sessions: rows.map(toFocusSessionDto) });
  });

  app.post("/api/v1/focus/sessions", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = startFocusInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true);
    if (access !== "ok") return notFound(reply);

    if (parsed.data.taskId) {
      const [task] = await database.db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, parsed.data.taskId),
            eq(tasks.spaceId, parsed.data.spaceId),
            isNull(tasks.deletedAt),
          ),
        )
        .limit(1);
      if (!task) return notFound(reply, "任务不存在");
    }

    const [open] = await database.db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, user.id),
          eq(focusSessions.spaceId, parsed.data.spaceId),
          isNull(focusSessions.endedAt),
        ),
      )
      .limit(1);
    if (open) {
      return sendError(reply, 409, apiErrorCodes.conflict, "已有未结束的专注会话", {
        details: { sessionId: open.id },
      });
    }

    const [session] = await database.db
      .insert(focusSessions)
      .values({
        spaceId: parsed.data.spaceId,
        userId: user.id,
        taskId: parsed.data.taskId ?? null,
        startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
      })
      .returning();
    if (!session) return reply;
    return reply.code(201).send(focusSessionResponseSchema.parse({ session: toFocusSessionDto(session) }));
  });

  app.patch("/api/v1/focus/sessions/:id/stop", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = stopFocusInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [session] = await database.db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.id, params.data.id), eq(focusSessions.userId, user.id)))
      .limit(1);
    if (!session) return notFound(reply);
    if (session.endedAt) {
      return sendError(reply, 409, apiErrorCodes.conflict, "该专注会话已经结束");
    }

    const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date();
    if (endedAt.getTime() < session.startedAt.getTime()) {
      return validationError(reply, { message: "结束时间不能早于开始时间" });
    }
    const durationSeconds = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    const [updated] = await database.db
      .update(focusSessions)
      .set({
        endedAt,
        durationSeconds,
        ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
      })
      .where(eq(focusSessions.id, session.id))
      .returning();
    if (!updated) return notFound(reply);
    try {
      await runAutomations(database.db, {
        trigger: "focus.completed",
        spaceId: updated.spaceId,
        userId: user.id,
        context: {
          sessionId: updated.id,
          durationSeconds: updated.durationSeconds ?? 0,
        },
      });
      await queueWebhooks(database.db, {
        spaceId: updated.spaceId,
        event: "focus.completed",
        payload: { sessionId: updated.id, durationSeconds: updated.durationSeconds ?? 0 },
      });
    } catch {
      // Automation must never fail the user's write.
    }
    return focusSessionResponseSchema.parse({ session: toFocusSessionDto(updated) });
  });
};
