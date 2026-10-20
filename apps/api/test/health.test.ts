import { afterAll, describe, expect, it } from "vitest";

import {
  API_SERVICE_NAME,
  apiErrorSchema,
  healthResponseSchema,
  readinessResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import type { ApiConfig } from "../src/config";

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  logLevel: "silent",
  corsOrigins: ["http://localhost:3000"],
  databaseUrl: undefined,
  sessionSecret: "test-session-secret",
  secureCookies: false,
  version: "0.1.0",
};

const app = await buildApp(config, { logger: false });
afterAll(async () => {
  await app.close();
});

describe("GET /health", () => {
  it("returns a contract-valid payload without a database", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = healthResponseSchema.parse(response.json());
    expect(body.service).toBe(API_SERVICE_NAME);
    expect(body.status).toBe("ok");
    expect(body.checks.database).toBe("disabled");
  });

  it("stays alive when the database is unavailable", async () => {
    const broken = await buildApp(
      { ...config, databaseUrl: "postgres://nobody:nobody@127.0.0.1:1/none" },
      { logger: false },
    );
    try {
      const response = await broken.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
      expect(healthResponseSchema.parse(response.json()).status).toBe("degraded");
    } finally {
      await broken.close();
    }
  });
});

describe("GET /ready", () => {
  it("is ready in local-only mode", async () => {
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(readinessResponseSchema.parse(response.json()).status).toBe("ready");
  });
});

describe("errors", () => {
  it("returns the shared envelope for unknown routes", async () => {
    const response = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(response.statusCode).toBe(404);
    const body = apiErrorSchema.parse(response.json());
    expect(body.code).toBe("NOT_FOUND");
    expect(body.correlationId).toBeTruthy();
  });

  it("returns 503 for data endpoints without a database", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/spaces" });
    expect(response.statusCode).toBe(503);
    expect(apiErrorSchema.parse(response.json()).code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("CORS", () => {
  it("allows the configured web origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:3000" },
    });
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
});
