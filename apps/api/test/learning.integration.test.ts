import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  calendarEventListResponseSchema,
  calendarEventResponseSchema,
  courseListResponseSchema,
  courseResponseSchema,
  createTaskInputSchema,
  taskResponseSchema,
  termResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";

const databaseUrl = process.env.DATABASE_URL;

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  logLevel: "silent",
  corsOrigins: [],
  databaseUrl,
  sessionSecret: "test-session-secret",
  secureCookies: false,
  version: "0.1.0",
};

interface CookieCarrier {
  cookies: Array<{ name: string; value: string }>;
}

function cookieHeader(response: CookieCarrier): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie) throw new Error("session cookie missing");
  return `${SESSION_COOKIE}=${cookie.value}`;
}

describe.skipIf(!databaseUrl)("milestone 1.2: courses, tasks and calendar", () => {
  let app: FastifyInstance;
  let cookieA = "";
  let spaceId = "";
  let courseId = "";
  let taskId = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookieA = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a term and a course, then lists them", async () => {
    const term = await app.inject({
      method: "POST",
      url: "/api/v1/terms",
      headers: { cookie: cookieA },
      payload: { spaceId, name: "2026 秋季学期", startsOn: "2026-09-01", endsOn: "2027-01-15" },
    });
    expect(term.statusCode).toBe(201);
    const termDto = termResponseSchema.parse(term.json()).term;

    const course = await app.inject({
      method: "POST",
      url: "/api/v1/courses",
      headers: { cookie: cookieA },
      payload: { spaceId, termId: termDto.id, name: "高等数学", code: "MATH101" },
    });
    expect(course.statusCode).toBe(201);
    courseId = courseResponseSchema.parse(course.json()).course.id;

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/courses?spaceId=${spaceId}`,
      headers: { cookie: cookieA },
    });
    expect(courseListResponseSchema.parse(list.json()).courses).toHaveLength(1);
  });

  it("rejects an invalid term range", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/terms",
      headers: { cookie: cookieA },
      payload: { spaceId, name: "倒序学期", startsOn: "2027-01-01", endsOn: "2026-01-01" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("creates a task referencing the course and updates it with versioning", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie: cookieA },
      payload: { spaceId, courseId, title: "完成第一章习题", priority: "high" },
    });
    expect(created.statusCode).toBe(201);
    const task = taskResponseSchema.parse(created.json()).task;
    taskId = task.id;
    expect(task.version).toBe(1);
    expect(task.courseId).toBe(courseId);

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${taskId}`,
      headers: { cookie: cookieA },
      payload: { status: "done", version: 1 },
    });
    expect(updated.statusCode).toBe(200);
    const next = taskResponseSchema.parse(updated.json()).task;
    expect(next.status).toBe("done");
    expect(next.version).toBe(2);

    const stale = await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${taskId}`,
      headers: { cookie: cookieA },
      payload: { title: "旧版本覆盖", version: 1 },
    });
    expect(stale.statusCode).toBe(409);
    expect((stale.json() as { details?: { currentVersion: number } }).details?.currentVersion).toBe(2);
  });

  it("validates task input", () => {
    expect(() => createTaskInputSchema.parse({ spaceId, title: "" })).toThrow();
    expect(() =>
      createTaskInputSchema.parse({ spaceId, title: "t", estimateMinutes: 2000 }),
    ).toThrow();
  });

  it("creates and lists a calendar event", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/calendar/events",
      headers: { cookie: cookieA },
      payload: {
        spaceId,
        title: "期中考试",
        startsAt: "2026-11-10T09:00:00+08:00",
        endsAt: "2026-11-10T11:00:00+08:00",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(calendarEventResponseSchema.parse(created.json()).event.title).toBe("期中考试");

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/calendar/events?spaceId=${spaceId}`,
      headers: { cookie: cookieA },
    });
    expect(calendarEventListResponseSchema.parse(list.json()).events).toHaveLength(1);
  });

  it("rejects an event that ends before it starts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/calendar/events",
      headers: { cookie: cookieA },
      payload: {
        spaceId,
        title: "倒序事件",
        startsAt: "2026-11-10T11:00:00+08:00",
        endsAt: "2026-11-10T09:00:00+08:00",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("hides another user's courses, tasks and events", async () => {
    const guestB = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const cookieB = cookieHeader(guestB);

    for (const url of [
      `/api/v1/courses?spaceId=${spaceId}`,
      `/api/v1/tasks?spaceId=${spaceId}`,
      `/api/v1/terms?spaceId=${spaceId}`,
      `/api/v1/calendar/events?spaceId=${spaceId}`,
    ]) {
      const response = await app.inject({ method: "GET", url, headers: { cookie: cookieB } });
      expect(response.statusCode, url).toBe(404);
    }

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${taskId}`,
      headers: { cookie: cookieB },
      payload: { title: "hijacked" },
    });
    expect(patch.statusCode).toBe(404);
  });
});
