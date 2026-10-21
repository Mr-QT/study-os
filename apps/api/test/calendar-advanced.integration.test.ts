import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  calendarEventResponseSchema,
  calendarOccurrenceListResponseSchema,
  digestResponseSchema,
  notificationListResponseSchema,
  notificationPreferenceResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";

const databaseUrl = process.env.DATABASE_URL;

interface CookieCarrier {
  cookies: Array<{ name: string; value: string }>;
}

function cookieHeader(response: CookieCarrier): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie) throw new Error("session cookie missing");
  return `${SESSION_COOKIE}=${cookie.value}`;
}

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  logLevel: "silent",
  corsOrigins: [],
  databaseUrl,
  sessionSecret: "test-session-secret",
  secureCookies: false,
  storageDir: "test-storage",
  version: "0.1.0",
};

describe.skipIf(!databaseUrl)("stage 4.3: recurring events, reminders and digest", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let eventId = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
    await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/preferences",
      headers: { cookie },
      payload: { quietStartHour: 0, quietEndHour: 0 },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a recurring event with a reminder", async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/calendar/events",
      headers: { cookie },
      payload: {
        spaceId,
        title: "每日复习",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        recurrence: "daily",
        recurrenceUntil: new Date(startsAt.getTime() + 6 * 86_400_000).toISOString(),
        reminderMinutes: 30,
      },
    });
    expect(response.statusCode).toBe(201);
    const event = calendarEventResponseSchema.parse(response.json()).event;
    eventId = event.id;
    expect(event.recurrence).toBe("daily");
    expect(event.reminderMinutes).toBe(30);
  });

  it("expands occurrences over a range", async () => {
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/calendar/occurrences?spaceId=${spaceId}&from=${from}&to=${to}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = calendarOccurrenceListResponseSchema.parse(response.json());
    expect(body.occurrences.filter((item) => item.eventId === eventId).length).toBeGreaterThanOrEqual(4);
  });

  it("schedules a reminder and reschedules it after an update", async () => {
    const list = async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/notifications?spaceId=${spaceId}`,
        headers: { cookie },
      });
      return notificationListResponseSchema.parse(response.json()).notifications;
    };

    const initial = (await list()).filter((item) => item.title.includes("每日复习"));
    expect(initial).toHaveLength(1);
    expect(initial[0]?.status).toBe("pending");

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/calendar/events/${eventId}`,
      headers: { cookie },
      payload: { reminderMinutes: 60 },
    });
    expect(patched.statusCode).toBe(200);
    const afterUpdate = (await list()).filter((item) => item.title.includes("每日复习"));
    expect(afterUpdate).toHaveLength(1);
    expect(Date.parse(afterUpdate[0]?.scheduledAt ?? "")).toBeLessThan(
      Date.parse(initial[0]?.scheduledAt ?? ""),
    );

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/v1/calendar/events/${eventId}`,
      headers: { cookie },
    });
    expect(deleted.statusCode).toBe(204);
    expect((await list()).filter((item) => item.title.includes("每日复习"))).toHaveLength(0);
  });

  it("updates quiet hours and digest preferences", async () => {
    const defaults = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/preferences",
      headers: { cookie },
    });
    expect(notificationPreferenceResponseSchema.parse(defaults.json()).preferences.timezone).toBe(
      "Asia/Shanghai",
    );

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/preferences",
      headers: { cookie },
      payload: { quietStartHour: 23, quietEndHour: 7, digestHour: 21, digestEnabled: true },
    });
    const preferences = notificationPreferenceResponseSchema.parse(updated.json()).preferences;
    expect(preferences.quietStartHour).toBe(23);
    expect(preferences.digestEnabled).toBe(true);
  });

  it("creates the daily digest once", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/digest",
      headers: { cookie },
    });
    const firstBody = digestResponseSchema.parse(first.json());
    expect(firstBody.created).toBe(true);
    expect(firstBody.notification?.title).toBe("今日学习摘要");

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/digest",
      headers: { cookie },
    });
    expect(digestResponseSchema.parse(second.json()).created).toBe(false);
  });
});
