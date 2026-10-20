import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  agentListResponseSchema,
  agentRunResponseSchema,
  analyticsOverviewSchema,
  authSessionResponseSchema,
  extractMemoriesResponseSchema,
  planListResponseSchema,
  planResponseSchema,
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
    const system = messages.find((message) => message.role === "system")?.content ?? "";
    let text = "先自己想一想，再对照定义。";
    if (system.includes("规划 Agent")) {
      text = JSON.stringify({
        steps: [
          { title: "诊断极限概念", type: "diagnose" },
          { title: "学习 ε-δ 定义", type: "study" },
          { title: "做五道练习", type: "practice" },
        ],
      });
    } else if (system.includes("提取")) {
      text = JSON.stringify([
        { content: "偏好先看例题", kind: "preference", confidence: 85 },
        { content: "正在准备高数期中", kind: "fact", confidence: 90 },
      ]);
    }
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

describe.skipIf(!databaseUrl)("stage 3.2: agents, learning plans and memory extraction", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let planId = "";
  let firstStepId = "";

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

  it("lists agents and runs the planner role", async () => {
    const list = await app.inject({ method: "GET", url: "/api/v1/agents" });
    expect(agentListResponseSchema.parse(list.json()).agents).toHaveLength(4);

    const run = await app.inject({
      method: "POST",
      url: "/api/v1/agents/planner/run",
      headers: { cookie },
      payload: { spaceId, input: "两周内复习高数上册" },
    });
    expect(run.statusCode).toBe(200);
    expect(agentRunResponseSchema.parse(run.json()).role).toBe("planner");
  });

  it("creates an adaptive plan and advances its steps", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/learning-plans",
      headers: { cookie },
      payload: { spaceId, goal: "两周内复习高数上册" },
    });
    expect(created.statusCode).toBe(201);
    const plan = planResponseSchema.parse(created.json()).plan;
    planId = plan.id;
    expect(plan.steps).toHaveLength(3);
    firstStepId = plan.steps[0]?.id ?? "";

    const advanced = await app.inject({
      method: "PATCH",
      url: `/api/v1/learning-plans/${planId}/steps`,
      headers: { cookie },
      payload: { stepId: firstStepId, status: "done" },
    });
    expect(advanced.statusCode).toBe(200);
    const updated = planResponseSchema.parse(advanced.json()).plan;
    expect(updated.steps.find((step) => step.id === firstStepId)?.status).toBe("done");

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/learning-plans?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(planListResponseSchema.parse(list.json()).plans.map((item) => item.id)).toContain(planId);
  });

  it("extracts memories from a conversation snippet", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/memories/extract",
      headers: { cookie },
      payload: { spaceId, text: "我喜欢先看例题，下周有高数期中考试。" },
    });
    expect(response.statusCode).toBe(200);
    const body = extractMemoriesResponseSchema.parse(response.json());
    expect(body.memories.length).toBeGreaterThanOrEqual(1);
    expect(body.memories[0]?.source).toBe("ai_extraction");
  });

  it("reports a numeric risk score", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/analytics/overview?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const body = analyticsOverviewSchema.parse(response.json());
    expect(body.riskScore).toBeGreaterThanOrEqual(0);
    expect(body.riskScore).toBeLessThanOrEqual(100);
  });
});
