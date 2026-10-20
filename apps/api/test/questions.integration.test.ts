import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import {
  attemptResultSchema,
  authSessionResponseSchema,
  questionListResponseSchema,
  questionResponseSchema,
  reviewQueueResponseSchema,
  wrongAnswersResponseSchema,
} from "@study-os/contracts";
import { createDb, createPool, reviewItems } from "@study-os/db";

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

describe.skipIf(!databaseUrl)("milestone 2.1: question bank and review", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let questionId = "";
  const pool = databaseUrl ? createPool(databaseUrl) : null;
  const db = pool ? createDb(pool) : null;

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
    await pool?.end();
  });

  it("creates and lists a question", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/questions",
      headers: { cookie },
      payload: {
        spaceId,
        prompt: "什么是极限？",
        answer: "当自变量趋近某值时，函数值趋近的确定值",
        explanation: "ε-δ 语言",
      },
    });
    expect(created.statusCode).toBe(201);
    const question = questionResponseSchema.parse(created.json()).question;
    questionId = question.id;
    expect(question.kind).toBe("short_answer");

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/questions?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(questionListResponseSchema.parse(list.json()).questions).toHaveLength(1);
  });

  it("grades a wrong attempt and lists it as a wrong answer", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: `/api/v1/questions/${questionId}/attempts`,
      headers: { cookie },
      payload: { answer: "不知道" },
    });
    expect(attempt.statusCode).toBe(200);
    const result = attemptResultSchema.parse(attempt.json());
    expect(result.correct).toBe(false);
    expect(result.intervalDays).toBe(1);

    const wrong = await app.inject({
      method: "GET",
      url: `/api/v1/questions/wrong?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(wrongAnswersResponseSchema.parse(wrong.json()).questions.map((q) => q.id)).toContain(
      questionId,
    );
  });

  it("schedules a due review item after a forced due date", async () => {
    expect(db).not.toBeNull();
    await db
      ?.update(reviewItems)
      .set({ dueAt: new Date(Date.now() - 60_000) })
      .where(eq(reviewItems.questionId, questionId));

    const queue = await app.inject({
      method: "GET",
      url: `/api/v1/review/queue?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const items = reviewQueueResponseSchema.parse(queue.json()).items;
    expect(items.map((item) => item.question.id)).toContain(questionId);
  });

  it("grades a correct attempt and pushes the next due date forward", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: `/api/v1/questions/${questionId}/attempts`,
      headers: { cookie },
      payload: { answer: "当自变量趋近某值时，函数值趋近的确定值" },
    });
    const result = attemptResultSchema.parse(attempt.json());
    expect(result.correct).toBe(true);
    expect(new Date(result.nextDueAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("hides questions from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const otherCookie = cookieHeader(other);
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/questions?spaceId=${spaceId}`,
      headers: { cookie: otherCookie },
    });
    expect(response.statusCode).toBe(404);
  });
});
