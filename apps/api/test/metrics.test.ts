import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
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
  storageDir: "test-storage",
  version: "0.1.0",
};

describe.skipIf(!databaseUrl)("operations: metrics", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes aggregate Prometheus metrics without user content", async () => {
    const response = await app.inject({ method: "GET", url: "/metrics" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toContain("studyos_up 1");
    expect(response.body).toContain("studyos_database_up 1");
    expect(response.body).toContain('studyos_rows{table="users"}');
    expect(response.body).not.toContain("@");
  });
});
