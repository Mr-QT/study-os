import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  analyticsOverviewSchema,
  authSessionResponseSchema,
  memoryListResponseSchema,
  memoryResponseSchema,
  questionResponseSchema,
  tutorResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";
import type { AiProvider } from "../src/ai/provider";

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
    const text = "先想想：极限描述的是什么趋势？";
    return {
      text,
      provider: "openai",
      model: "stub-1",
      promptChars: messages.reduce((total, message) => total + message.content.length, 0),
      completionChars: text.length,
    };
  },
};

const config: ApiConfig = {
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

describe.skipIf(!databaseUrl)("stage 3: memory, analytics and tutor", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let memoryId = "";
  let questionId = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false }, { aiProvider: stubProvider });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";

    const question = await app.inject({
      method: "POST",
      url: "/api/v1/questions",
      headers: { cookie },
      payload: { spaceId, prompt: "什么是极限？", answer: "趋势的确定值" },
    });
    questionId = questionResponseSchema.parse(question.json()).question.id;
    await app.inject({
      method: "POST",
      url: `/api/v1/questions/${questionId}/attempts`,
      headers: { cookie },
      payload: { answer: "不知道" },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie },
      payload: {
        spaceId,
        title: "过期任务",
        dueAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates, lists, disables and deletes a memory", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: { cookie },
      payload: { spaceId, content: "偏好先看例题再看定义", kind: "preference" },
    });
    expect(created.statusCode).toBe(201);
    memoryId = memoryResponseSchema.parse(created.json()).memory.id;

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/memories?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(memoryListResponseSchema.parse(list.json()).memories.map((m) => m.id)).toContain(memoryId);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/memories/${memoryId}`,
      headers: { cookie },
      payload: { disabled: true },
    });
    expect(memoryResponseSchema.parse(patched.json()).memory.disabled).toBe(true);
  });

  it("reports analytics with risks from overdue tasks and weak questions", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/analytics/overview?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = analyticsOverviewSchema.parse(response.json());
    expect(body.tasks.total).toBeGreaterThanOrEqual(1);
    expect(body.tasks.overdue).toBeGreaterThanOrEqual(1);
    expect(body.risks).toContain("overdue_tasks");
    expect(body.weakQuestions.some((item) => item.questionId === questionId)).toBe(true);
  });

  it("answers through the tutor with memory and weak-question context", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/tutor",
      headers: { cookie },
      payload: { spaceId, question: "极限和导数是什么关系？", mode: "socratic" },
    });
    expect(response.statusCode).toBe(200);
    const body = tutorResponseSchema.parse(response.json());
    expect(body.text.length).toBeGreaterThan(0);
    expect(body.memoriesUsed).toBeGreaterThanOrEqual(0);
    expect(body.weakQuestionsUsed).toBeGreaterThanOrEqual(1);
  });

  it("hides memories from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/memories?spaceId=${spaceId}`,
      headers: { cookie: cookieHeader(other) },
    });
    expect(response.statusCode).toBe(404);
  });
});
