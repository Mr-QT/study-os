import type { FastifyPluginAsync } from "fastify";

import { and, eq, gte, lte } from "drizzle-orm";

import {
  calendarEventListResponseSchema,
  calendarEventQuerySchema,
  calendarEventResponseSchema,
  createCalendarEventInputSchema,
} from "@study-os/contracts";
import { calendarEvents } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { toCalendarEventDto } from "../dto";
import { notFound, validationError } from "../http/errors";

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

  app.post("/api/v1/calendar/events", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createCalendarEventInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true);
    if (access !== "ok") return notFound(reply);

    const [event] = await database.db
      .insert(calendarEvents)
      .values({
        spaceId: parsed.data.spaceId,
        title: parsed.data.title,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        timezone: parsed.data.timezone ?? "Asia/Shanghai",
      })
      .returning();
    if (!event) return reply;
    return reply.code(201).send(calendarEventResponseSchema.parse({ event: toCalendarEventDto(event) }));
  });
};
