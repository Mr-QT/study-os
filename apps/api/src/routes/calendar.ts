import type { FastifyPluginAsync } from "fastify";

import { and, eq, gte, like, lte } from "drizzle-orm";

import {
  calendarEventListResponseSchema,
  calendarEventQuerySchema,
  calendarEventResponseSchema,
  calendarOccurrenceListResponseSchema,
  createCalendarEventInputSchema,
  idParamSchema,
  updateCalendarEventInputSchema,
} from "@study-os/contracts";
import { calendarEvents, notifications, type CalendarEventRow, type Db } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { expandOccurrences } from "../calendar/occurrences";
import { toCalendarEventDto } from "../dto";
import { notFound, validationError } from "../http/errors";
import { getPreferences, nextAllowedTime } from "../notifications/preferences";

async function scheduleReminder(
  db: Db,
  event: CalendarEventRow,
  userId: string,
): Promise<void> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.status, "pending"),
        like(notifications.dedupeKey, `event:${event.id}:%`),
      ),
    );

  if (event.reminderMinutes === null || event.reminderMinutes === undefined) return;
  const remindAt = new Date(event.startsAt.getTime() - event.reminderMinutes * 60_000);
  if (remindAt.getTime() <= Date.now()) return;

  const prefs = await getPreferences(db, userId);
  await db.insert(notifications).values({
    userId,
    spaceId: event.spaceId,
    title: `${event.title} 即将开始`,
    body: `提醒：${event.startsAt.toISOString()}`,
    channel: "in_app",
    status: "pending",
    scheduledAt: nextAllowedTime(remindAt, prefs),
    dedupeKey: `event:${event.id}:reminder`,
  });
}

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/calendar/events", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = calendarEventQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    const from = query.data.from ? new Date(query.data.from) : null;
    const to = query.data.to ? new Date(query.data.to) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return validationError(reply, { message: "from/to 需要 ISO 日期时间" });
    }

    const conditions = [eq(calendarEvents.spaceId, query.data.spaceId)];
    if (from) conditions.push(gte(calendarEvents.startsAt, from));
    if (to) conditions.push(lte(calendarEvents.startsAt, to));

    const rows = await database.db
      .select()
      .from(calendarEvents)
      .where(and(...conditions));
    return calendarEventListResponseSchema.parse({ events: rows.map(toCalendarEventDto) });
  });

  app.get("/api/v1/calendar/occurrences", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = calendarEventQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const now = new Date();
    const from = query.data.from ? new Date(query.data.from) : new Date(now.getTime() - 7 * 86_400_000);
    const to = query.data.to ? new Date(query.data.to) : new Date(now.getTime() + 30 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      return validationError(reply, { message: "from/to 需要合法的 ISO 日期时间" });
    }

    const rows = await database.db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.spaceId, query.data.spaceId), lte(calendarEvents.startsAt, to)));

    return calendarOccurrenceListResponseSchema.parse({
      occurrences: expandOccurrences(rows, from, to),
    });
  });

  app.post("/api/v1/calendar/events", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createCalendarEventInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const [event] = await database.db
      .insert(calendarEvents)
      .values({
        spaceId: parsed.data.spaceId,
        createdBy: user.id,
        title: parsed.data.title,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        timezone: parsed.data.timezone ?? "Asia/Shanghai",
        recurrence: parsed.data.recurrence ?? "none",
        recurrenceUntil: parsed.data.recurrenceUntil
          ? new Date(parsed.data.recurrenceUntil)
          : null,
        reminderMinutes: parsed.data.reminderMinutes ?? null,
      })
      .returning();
    if (!event) return reply;
    await scheduleReminder(database.db, event, user.id);
    return reply.code(201).send(calendarEventResponseSchema.parse({ event: toCalendarEventDto(event) }));
  });

  app.patch("/api/v1/calendar/events/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateCalendarEventInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, params.data.id))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, existing.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : existing.startsAt;
    const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) {
      return validationError(reply, { message: "结束时间必须晚于开始时间" });
    }

    const [updated] = await database.db
      .update(calendarEvents)
      .set({
        ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
        startsAt,
        endsAt,
        ...(parsed.data.timezone === undefined ? {} : { timezone: parsed.data.timezone }),
        ...(parsed.data.recurrence === undefined ? {} : { recurrence: parsed.data.recurrence }),
        ...(parsed.data.recurrenceUntil === undefined
          ? {}
          : {
              recurrenceUntil: parsed.data.recurrenceUntil
                ? new Date(parsed.data.recurrenceUntil)
                : null,
            }),
        ...(parsed.data.reminderMinutes === undefined
          ? {}
          : { reminderMinutes: parsed.data.reminderMinutes }),
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    await scheduleReminder(database.db, updated, user.id);
    return calendarEventResponseSchema.parse({ event: toCalendarEventDto(updated) });
  });

  app.delete("/api/v1/calendar/events/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [existing] = await database.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, params.data.id))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, existing.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    await database.db
      .delete(notifications)
      .where(
        and(
          eq(notifications.status, "pending"),
          like(notifications.dedupeKey, `event:${existing.id}:%`),
        ),
      );
    await database.db.delete(calendarEvents).where(eq(calendarEvents.id, existing.id));
    return reply.code(204).send();
  });
};
