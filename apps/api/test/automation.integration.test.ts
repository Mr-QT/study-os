import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  automationRuleListResponseSchema,
  automationRuleResponseSchema,
  automationRunListResponseSchema,
  dispatchResponseSchema,
  dryRunResponseSchema,
  notificationListResponseSchema,
  notificationSchema,
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

describe.skipIf(!databaseUrl)("stage 4: automation rules and notifications", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let ruleId = "";

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

  it("creates a rule with a notification action", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/automation/rules",
      headers: { cookie },
      payload: {
        spaceId,
        name: "任务完成提醒",
        trigger: "task.completed",
        actions: [{ type: "create_notification", title: "任务完成", body: "干得好" }],
      },
    });
    expect(created.statusCode).toBe(201);
    ruleId = automationRuleResponseSchema.parse(created.json()).rule.id;

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/automation/rules?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(automationRuleListResponseSchema.parse(list.json()).rules).toHaveLength(1);
  });

  it("dry-runs the rule against matching conditions", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/automation/rules/${ruleId}/dry-run`,
      headers: { cookie },
      payload: { context: { taskId: "ignored" } },
    });
    const body = dryRunResponseSchema.parse(response.json());
    expect(body.matched).toBe(true);
    expect(body.actions).toHaveLength(1);
  });

  it("fires automation when a task is completed", async () => {
    const task = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie },
      payload: { spaceId, title: "触发自动化的任务" },
    });
    const created = taskResponseSchema.parse(task.json()).task;

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${created.id}`,
      headers: { cookie },
      payload: { status: "done", version: created.version },
    });
    expect(patched.statusCode).toBe(200);

    const notificationsResponse = await app.inject({
      method: "GET",
      url: `/api/v1/notifications?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const notifications = notificationListResponseSchema.parse(notificationsResponse.json());
    expect(notifications.notifications.some((item) => item.title === "任务完成")).toBe(true);
    expect(notifications.unread).toBeGreaterThanOrEqual(1);

    const runs = await app.inject({
      method: "GET",
      url: `/api/v1/automation/runs?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(automationRunListResponseSchema.parse(runs.json()).runs[0]?.status).toBe("ok");
  });

  it("dispatches in-app notifications and marks them read", async () => {
    const dispatch = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/dispatch",
      headers: { cookie },
    });
    expect(dispatchResponseSchema.parse(dispatch.json()).sent).toBeGreaterThanOrEqual(1);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { cookie },
    });
    const first = notificationListResponseSchema.parse(list.json()).notifications[0];
    expect(first).toBeDefined();

    const read = await app.inject({
      method: "PATCH",
      url: `/api/v1/notifications/${first?.id}/read`,
      headers: { cookie },
    });
    expect(notificationSchema.parse(read.json()).status).toBe("read");
  });

  it("rejects another user's access to rules", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/automation/rules?spaceId=${spaceId}`,
      headers: { cookie: cookieHeader(other) },
    });
    expect(response.statusCode).toBe(404);
  });
});
