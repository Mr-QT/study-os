import type { FastifyPluginAsync } from "fastify";

import { and, eq, gte, isNull, sql } from "drizzle-orm";

import { spaceQuerySchema, statsResponseSchema } from "@study-os/contracts";
import { courses, fileAssets, focusSessions, memberships, notes, tasks } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/stats", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    const spaceId = query.data.spaceId;
    const db = database.db;

    const [spacesRow] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(memberships)
      .where(eq(memberships.userId, user.id));
    const [coursesRow] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(courses)
      .where(and(eq(courses.spaceId, spaceId), isNull(courses.deletedAt)));
    const [tasksRow] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.spaceId, spaceId), isNull(tasks.deletedAt)));
    const [tasksDoneRow] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.spaceId, spaceId), isNull(tasks.deletedAt), eq(tasks.status, "done")));
    const [notesRow] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(notes)
      .where(and(eq(notes.spaceId, spaceId), isNull(notes.deletedAt)));
    const [filesRow] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(fileAssets)
      .where(and(eq(fileAssets.spaceId, spaceId), isNull(fileAssets.deletedAt)));

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [focusRow] = await db
      .select({ total: sql<string | null>`coalesce(sum(${focusSessions.durationSeconds}), 0)` })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.spaceId, spaceId),
          eq(focusSessions.userId, user.id),
          gte(focusSessions.startedAt, since),
        ),
      );

    return statsResponseSchema.parse({
      counts: {
        spaces: Number(spacesRow?.total ?? 0),
        courses: Number(coursesRow?.total ?? 0),
        tasks: Number(tasksRow?.total ?? 0),
        tasksDone: Number(tasksDoneRow?.total ?? 0),
        notes: Number(notesRow?.total ?? 0),
        files: Number(filesRow?.total ?? 0),
        focusMinutes7d: Math.round(Number(focusRow?.total ?? 0) / 60),
      },
    });
  });
};
