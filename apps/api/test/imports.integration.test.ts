import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  importBatchListResponseSchema,
  importCommitResponseSchema,
  importPreviewResponseSchema,
  importRollbackResponseSchema,
  taskListResponseSchema,
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

const CSV = [
  "title,notes,dueAt",
  "导入任务一,来自 CSV,2026-12-01T09:00:00Z",
  ",缺少标题,",
  '"导入,任务二",带逗号,',
].join("\n");

describe.skipIf(!databaseUrl)("stage 5.2: CSV import preview, commit and rollback", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let batchId = "";

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

  it("previews valid and invalid rows without creating entities", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/imports/preview",
      headers: { cookie },
      payload: { spaceId, kind: "tasks", csv: CSV, filename: "tasks.csv" },
    });
    expect(response.statusCode).toBe(200);
    const body = importPreviewResponseSchema.parse(response.json());
    batchId = body.batch.id;
    expect(body.batch.totalRows).toBe(3);
    expect(body.batch.validRows).toBe(2);
    expect(body.batch.invalidRows).toBe(1);
    expect(body.rows.find((row) => !row.valid)?.error).toContain("title");

    const tasks = await app.inject({
      method: "GET",
      url: `/api/v1/tasks?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(taskListResponseSchema.parse(tasks.json()).tasks).toHaveLength(0);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/imports?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(importBatchListResponseSchema.parse(list.json()).batches[0]?.id).toBe(batchId);
  });

  it("returns the original CSV with its checksum", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/imports/${batchId}/original`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(CSV);
    expect(response.headers["x-content-sha256"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("commits valid rows idempotently", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/imports/${batchId}/commit`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = importCommitResponseSchema.parse(response.json());
    expect(body.created).toBe(2);
    expect(body.batch.status).toBe("committed");

    const tasks = await app.inject({
      method: "GET",
      url: `/api/v1/tasks?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const titles = taskListResponseSchema.parse(tasks.json()).tasks.map((task) => task.title);
    expect(titles).toContain("导入任务一");
    expect(titles).toContain("导入,任务二");

    const again = await app.inject({
      method: "POST",
      url: `/api/v1/imports/${batchId}/commit`,
      headers: { cookie },
    });
    expect(again.statusCode).toBe(409);
  });

  it("rolls back created entities and protects the batch", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/imports/${batchId}/rollback`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = importRollbackResponseSchema.parse(response.json());
    expect(body.deleted).toBe(2);
    expect(body.batch.status).toBe("rolled_back");

    const tasks = await app.inject({
      method: "GET",
      url: `/api/v1/tasks?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(taskListResponseSchema.parse(tasks.json()).tasks).toHaveLength(0);

    const again = await app.inject({
      method: "POST",
      url: `/api/v1/imports/${batchId}/rollback`,
      headers: { cookie },
    });
    expect(again.statusCode).toBe(409);
  });

  it("imports tasks from a JSON array", async () => {
    const preview = await app.inject({
      method: "POST",
      url: "/api/v1/imports/preview",
      headers: { cookie },
      payload: {
        spaceId,
        kind: "tasks",
        filename: "tasks.json",
        csv: JSON.stringify([{ title: "JSON任务", dueAt: "2026-12-02T09:00:00Z" }]),
      },
    });
    expect(preview.statusCode).toBe(200);
    const body = importPreviewResponseSchema.parse(preview.json());
    expect(body.batch.validRows).toBe(1);

    const commit = await app.inject({
      method: "POST",
      url: `/api/v1/imports/${body.batch.id}/commit`,
      headers: { cookie },
    });
    expect(importCommitResponseSchema.parse(commit.json()).created).toBe(1);

    const tasks = await app.inject({
      method: "GET",
      url: `/api/v1/tasks?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(taskListResponseSchema.parse(tasks.json()).tasks.map((task) => task.title)).toContain(
      "JSON任务",
    );
  });

  it("hides imports from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/imports/${batchId}/original`,
      headers: { cookie: cookieHeader(other) },
    });
    expect(response.statusCode).toBe(404);
  });
});
