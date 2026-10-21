import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  goalListResponseSchema,
  goalResponseSchema,
  habitListResponseSchema,
  habitResponseSchema,
  profileExportResponseSchema,
  profileSummarySchema,
  taskResponseSchema,
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

describe.skipIf(!databaseUrl)("stage 5.1: goals, habits, achievements and export", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let goalId = "";
  let habitId = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  it("tracks goal progress from completed tasks", async () => {
    const startsAt = new Date(Date.now() - 86_400_000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/goals",
      headers: { cookie },
      payload: {
        spaceId,
        title: "本周完成 2 个任务",
        metric: "tasks_done",
        targetValue: 2,
        startsAt,
        endsAt,
      },
    });
    expect(created.statusCode).toBe(201);
    const goal = goalResponseSchema.parse(created.json()).goal;
    goalId = goal.id;
    expect(goal.currentValue).toBe(0);

    for (const title of ["任务一", "任务二"]) {
      const task = await app.inject({
        method: "POST",
        url: "/api/v1/tasks",
        headers: { cookie },
        payload: { spaceId, title },
      });
      const row = taskResponseSchema.parse(task.json()).task;
      await app.inject({
        method: "PATCH",
        url: `/api/v1/tasks/${row.id}`,
        headers: { cookie },
        payload: { status: "done", version: row.version },
      });
    }

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/goals?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const tracked = goalListResponseSchema.parse(list.json()).goals.find((item) => item.id === goalId);
    expect(tracked?.currentValue).toBe(2);
    expect(tracked?.progressPercent).toBe(100);
  });

  it("checks in habits idempotently per day and computes a streak", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/habits",
      headers: { cookie },
      payload: { spaceId, title: "每天复习 10 分钟", cadence: "daily" },
    });
    expect(created.statusCode).toBe(201);
    habitId = habitResponseSchema.parse(created.json()).habit.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habits/${habitId}/checkins`,
      headers: { cookie },
      payload: {},
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/habits/${habitId}/checkins`,
      headers: { cookie },
      payload: {},
    });
    const habit = habitResponseSchema.parse(second.json()).habit;
    expect(habit.todayCount).toBe(2);
    expect(habit.streak).toBe(1);
  });

  it("aggregates a profile with achievements and provenance", async () => {
    const focus = await app.inject({
      method: "POST",
      url: "/api/v1/focus/sessions",
      headers: { cookie },
      payload: { spaceId, startedAt: new Date(Date.now() - 120_000).toISOString() },
    });
    const session = (focus.json() as { session: { id: string } }).session;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/focus/sessions/${session.id}/stop`,
      headers: { cookie },
      payload: {},
    });

    const summary = await app.inject({
      method: "GET",
      url: `/api/v1/profile/summary?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const body = profileSummarySchema.parse(summary.json());
    expect(body.totals.tasksDone).toBeGreaterThanOrEqual(2);
    expect(body.totals.focusMinutes).toBeGreaterThanOrEqual(1);
    expect(body.achievements.find((item) => item.id === "first_focus")?.earned).toBe(true);

    const exportResponse = await app.inject({
      method: "GET",
      url: `/api/v1/profile/export?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const exported = profileExportResponseSchema.parse(exportResponse.json());
    expect(exported.markdown).toContain("专注");
    expect(exported.markdown).toContain("focus_sessions");
    expect(exported.markdown).toContain("空间");
  });

  it("hides goals from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/goals?spaceId=${spaceId}`,
      headers: { cookie: cookieHeader(other) },
    });
    expect(response.statusCode).toBe(404);
  });

  it("lists habits for the owner", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/habits?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(habitListResponseSchema.parse(response.json()).habits.map((item) => item.id)).toContain(
      habitId,
    );
  });
});
