import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  aiRequestResponseSchema,
  aiStatusResponseSchema,
  aiUsageResponseSchema,
  authSessionResponseSchema,
  statsResponseSchema,
  syncPullResponseSchema,
  syncPushResultSchema,
  taskResponseSchema,
} from "@study-os/contracts";
import type { AiProvider } from "../src/ai/provider";

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

const stubProvider: AiProvider = {
  name: "openai",
  model: "stub-1",
  async complete(messages) {
    const text = "建议：先复习极限的定义，再做两道练习。";
    return {
      text,
      provider: "openai",
      model: "stub-1",
      promptChars: messages.reduce((total, message) => total + message.content.length, 0),
      completionChars: text.length,
    };
  },
};

const baseConfig: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  logLevel: "silent",
  corsOrigins: [],
  databaseUrl,
  sessionSecret: "test-session-secret",
  secureCookies: false,
  storageDir: "test-storage",
  aiProvider: "openai",
  aiApiKey: "test-key",
  aiBudgetUsd: 10,
  version: "0.1.0",
};

describe.skipIf(!databaseUrl)("milestone 1.4/1.5: AI gateway, sync and stats", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let taskId = "";
  let taskVersion = 1;

  beforeAll(async () => {
    app = await buildApp(baseConfig, { logger: false }, { aiProvider: stubProvider });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports AI status and records a completion", async () => {
    const status = await app.inject({
      method: "GET",
      url: "/api/v1/ai/status",
      headers: { cookie },
    });
    expect(aiStatusResponseSchema.parse(status.json()).enabled).toBe(true);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/requests",
      headers: { cookie },
      payload: { spaceId, purpose: "study_plan", input: "帮我规划两周的高数复习" },
    });
    expect(response.statusCode).toBe(200);
    expect(aiRequestResponseSchema.parse(response.json()).text).toContain("建议");

    const usage = await app.inject({
      method: "GET",
      url: "/api/v1/ai/usage",
      headers: { cookie },
    });
    const body = aiUsageResponseSchema.parse(usage.json());
    expect(body.calls).toBeGreaterThanOrEqual(1);
    expect(body.spentUsd).toBeGreaterThanOrEqual(0);
  });

  it("rejects AI calls without a configured provider", async () => {
    const disabled = await buildApp(
      { ...baseConfig, aiProvider: "disabled" },
      { logger: false },
      { aiProvider: null },
    );
    try {
      const guest = await disabled.inject({ method: "POST", url: "/api/v1/auth/guest" });
      const body = authSessionResponseSchema.parse(guest.json());
      const response = await disabled.inject({
        method: "POST",
        url: "/api/v1/ai/requests",
        headers: { cookie: cookieHeader(guest) },
        payload: { spaceId: body.spaces[0]?.id, purpose: "explain", input: "什么是极限？" },
      });
      expect(response.statusCode).toBe(503);
    } finally {
      await disabled.close();
    }
  });

  it("denies cloud AI in a private-local space", async () => {
    const space = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers: { cookie },
      payload: { name: "私密空间", privacyLevel: "private_local" },
    });
    const privateSpaceId = (space.json() as { space: { id: string } }).space.id;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/requests",
      headers: { cookie },
      payload: { spaceId: privateSpaceId, purpose: "explain", input: "私密问题" },
    });
    expect(response.statusCode).toBe(403);
    expect((response.json() as { code: string }).code).toBe("PRIVACY_DENIED");
  });

  it("enforces the monthly budget", async () => {
    const tiny = await buildApp(
      { ...baseConfig, aiBudgetUsd: 0.000001 },
      { logger: false },
      { aiProvider: stubProvider },
    );
    try {
      const guest = await tiny.inject({ method: "POST", url: "/api/v1/auth/guest" });
      const body = authSessionResponseSchema.parse(guest.json());
      const target = body.spaces[0]?.id;
      const guestCookie = cookieHeader(guest);

      const first = await tiny.inject({
        method: "POST",
        url: "/api/v1/ai/requests",
        headers: { cookie: guestCookie },
        payload: { spaceId: target, purpose: "explain", input: "第一次调用" },
      });
      expect(first.statusCode).toBe(200);

      const second = await tiny.inject({
        method: "POST",
        url: "/api/v1/ai/requests",
        headers: { cookie: guestCookie },
        payload: { spaceId: target, purpose: "explain", input: "第二次调用" },
      });
      expect(second.statusCode).toBe(402);
    } finally {
      await tiny.close();
    }
  });

  it("pushes a task patch through sync and rejects a stale version", async () => {
    const task = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie },
      payload: { spaceId, title: "同步任务" },
    });
    const created = taskResponseSchema.parse(task.json()).task;
    taskId = created.id;
    taskVersion = created.version;

    const stale = await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
      headers: { cookie },
      payload: {
        spaceId,
        operations: [
          {
            opId: crypto.randomUUID(),
            entityType: "task",
            entityId: taskId,
            action: "patch",
            patch: { status: "done" },
            baseVersion: 99,
          },
        ],
      },
    });
    expect(stale.statusCode).toBe(200);
    expect(syncPushResultSchema.parse(stale.json()).results[0]?.status).toBe("conflict");

    const accepted = await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
      headers: { cookie },
      payload: {
        spaceId,
        operations: [
          {
            opId: crypto.randomUUID(),
            entityType: "task",
            entityId: taskId,
            action: "patch",
            patch: { status: "done" },
            baseVersion: taskVersion,
          },
        ],
      },
    });
    const result = syncPushResultSchema.parse(accepted.json()).results[0];
    expect(result?.status).toBe("accepted");
    expect(result?.version).toBe(taskVersion + 1);
  });

  it("pulls incremental changes with a cursor", async () => {
    const first = await app.inject({
      method: "GET",
      url: `/api/v1/sync/pull?spaceId=${spaceId}&cursor=0&limit=50`,
      headers: { cookie },
    });
    expect(first.statusCode).toBe(200);
    const page = syncPullResponseSchema.parse(first.json());
    expect(page.changes.length).toBeGreaterThan(0);
    expect(page.nextCursor).toBeGreaterThan(0);

    const second = await app.inject({
      method: "GET",
      url: `/api/v1/sync/pull?spaceId=${spaceId}&cursor=${page.nextCursor}&limit=50`,
      headers: { cookie },
    });
    const next = syncPullResponseSchema.parse(second.json());
    expect(next.changes.every((change) => change.cursor > page.nextCursor)).toBe(true);
  });

  it("returns space statistics", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/stats?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = statsResponseSchema.parse(response.json());
    expect(body.counts.tasks).toBeGreaterThanOrEqual(1);
    expect(body.counts.tasksDone).toBeGreaterThanOrEqual(1);
  });
});
