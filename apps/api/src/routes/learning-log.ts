import type { FastifyPluginAsync } from "fastify";

import { and, eq, gte } from "drizzle-orm";

import { learningLogDaySchema, learningLogResponseSchema, spaceQuerySchema } from "@study-os/contracts";
import { focusSessions } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

export const learningLogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/learning-logs", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());

    const rawDays = (request.query as { days?: string }).days;
    const days = rawDays ? Number(rawDays) : 14;
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return validationError(reply, { message: "days 必须是 1–90 的整数" });
    }

    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await database.db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.spaceId, query.data.spaceId),
          eq(focusSessions.userId, user.id),
          gte(focusSessions.startedAt, since),
        ),
      );

    const byDate = new Map<string, { minutes: number; sessions: number }>();
    for (const row of rows) {
      if (!row.endedAt || !row.durationSeconds) continue;
      const key = row.startedAt.toISOString().slice(0, 10);
      const bucket = byDate.get(key) ?? { minutes: 0, sessions: 0 };
      bucket.minutes += Math.round(row.durationSeconds / 60);
      bucket.sessions += 1;
      byDate.set(key, bucket);
    }

    const result = [...byDate.entries()]
      .map(([date, bucket]) =>
        learningLogDaySchema.parse({ date, minutes: bucket.minutes, sessions: bucket.sessions }),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return learningLogResponseSchema.parse({ days: result });
  });
};
