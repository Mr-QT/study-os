import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  automationRuleResponseSchema,
  notificationListResponseSchema,
  questionResponseSchema,
  ruleDraftResponseSchema,
  startExamAttemptResponseSchema,
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
    const text = JSON.stringify({
      name: "AI 规则草案",
      trigger: "task.completed",
      conditions: {},
      actions: [{ type: "create_notification", title: "来自草案的通知" }],
    });
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

describe.skipIf(!databaseUrl)("stage 4.2: focus/exam events, delays, dedupe and rule drafts", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";

  async function createRule(payload: Record<string, unknown>): Promise<void> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/automation/rules",
      headers: { cookie },
      payload: { spaceId, ...payload },
    });
    expect(response.statusCode).toBe(201);
    automationRuleResponseSchema.parse(response.json());
  }

  async function notifications(): Promise<ReturnType<typeof notificationListResponseSchema.parse>> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/notifications?spaceId=${spaceId}`,
      headers: { cookie },
    });
    return notificationListResponseSchema.parse(response.json());
  }

  beforeAll(async () => {
    app = await buildApp(config, { logger: false }, { aiProvider: stubProvider });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  it("fires focus.completed when a focus session stops", async () => {
    await createRule({
      name: "专注完成提醒",
      trigger: "focus.completed",
      actions: [{ type: "create_notification", title: "专注完成" }],
    });

    const started = await app.inject({
      method: "POST",
      url: "/api/v1/focus/sessions",
      headers: { cookie },
      payload: { spaceId, startedAt: new Date(Date.now() - 90_000).toISOString() },
    });
    const session = (started.json() as { session: { id: string } }).session;
    const stopped = await app.inject({
      method: "PATCH",
      url: `/api/v1/focus/sessions/${session.id}/stop`,
      headers: { cookie },
      payload: {},
    });
    expect(stopped.statusCode).toBe(200);
    expect((await notifications()).notifications.some((item) => item.title === "专注完成")).toBe(
      true,
    );
  });

  it("fires exam.submitted when an attempt is submitted", async () => {
    await createRule({
      name: "考试提交提醒",
      trigger: "exam.submitted",
      actions: [{ type: "create_notification", title: "考试已提交" }],
    });

    const question = await app.inject({
      method: "POST",
      url: "/api/v1/questions",
      headers: { cookie },
      payload: { spaceId, prompt: "1+1=?", answer: "2" },
    });
    const questionId = questionResponseSchema.parse(question.json()).question.id;

    const exam = await app.inject({
      method: "POST",
      url: "/api/v1/exams",
      headers: { cookie },
      payload: { spaceId, title: "自动化考试", questionIds: [questionId] },
    });
    const examId = (exam.json() as { exam: { id: string } }).exam.id;

    const attempt = await app.inject({
      method: "POST",
      url: `/api/v1/exams/${examId}/attempts`,
      headers: { cookie },
    });
    const attemptId = startExamAttemptResponseSchema.parse(attempt.json()).attempt.id;
    await app.inject({
      method: "POST",
      url: `/api/v1/exam-attempts/${attemptId}/submit`,
      headers: { cookie },
      payload: { answers: { [questionId]: "2" } },
    });

    expect(
      (await notifications()).notifications.some((item) => item.title === "考试已提交"),
    ).toBe(true);
  });

  it("supports delayed and deduplicated notifications", async () => {
    await createRule({
      name: "延迟去重提醒",
      trigger: "task.completed",
      actions: [
        {
          type: "create_notification",
          title: "延迟提醒",
          delayMinutes: 60,
          dedupeKey: `dedupe-${Date.now()}`,
        },
      ],
    });

    for (const title of ["任务 A", "任务 B"]) {
      const task = await app.inject({
        method: "POST",
        url: "/api/v1/tasks",
        headers: { cookie },
        payload: { spaceId, title },
      });
      const created = (task.json() as { task: { id: string; version: number } }).task;
      await app.inject({
        method: "PATCH",
        url: `/api/v1/tasks/${created.id}`,
        headers: { cookie },
        payload: { status: "done", version: created.version },
      });
    }

    const delayed = (await notifications()).notifications.filter(
      (item) => item.title === "延迟提醒",
    );
    expect(delayed).toHaveLength(1);
    expect(new Date(delayed[0]?.scheduledAt ?? 0).getTime()).toBeGreaterThan(Date.now());
  });

  it("drafts a rule from natural language", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/automation/rules/draft",
      headers: { cookie },
      payload: { spaceId, text: "完成任务后提醒我休息" },
    });
    expect(response.statusCode).toBe(200);
    const draft = ruleDraftResponseSchema.parse(response.json());
    expect(draft.trigger).toBe("task.completed");
    expect(draft.actions[0]?.title).toBe("来自草案的通知");
  });
});
