import { afterAll, describe, expect, it } from "vitest";

import { healthResponseSchema, readinessResponseSchema } from "@study-os/contracts";

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
  version: "0.1.0",
};

describe.skipIf(!databaseUrl)("PostgreSQL integration", () => {
  const appPromise = buildApp(config, { logger: false });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it("reports the database as ok", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json()).checks.database).toBe("ok");
  });

  it("is ready when the database responds", async () => {
    const app = await appPromise;
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(readinessResponseSchema.parse(response.json()).status).toBe("ready");
  });
});
