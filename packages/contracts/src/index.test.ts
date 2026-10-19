import { describe, expect, it } from "vitest";

import {
  API_SERVICE_NAME,
  apiErrorSchema,
  healthResponseSchema,
  readinessResponseSchema,
} from "./index";

const validHealth = {
  status: "ok",
  service: API_SERVICE_NAME,
  version: "0.1.0",
  uptimeSeconds: 12.5,
  timestamp: new Date().toISOString(),
  checks: { database: "disabled" },
} as const;

describe("healthResponseSchema", () => {
  it("accepts a valid payload", () => {
    expect(healthResponseSchema.parse(validHealth)).toEqual(validHealth);
  });

  it("rejects a negative uptime", () => {
    expect(() => healthResponseSchema.parse({ ...validHealth, uptimeSeconds: -1 })).toThrow();
  });

  it("rejects an unknown database state", () => {
    expect(() =>
      healthResponseSchema.parse({ ...validHealth, checks: { database: "unknown" } }),
    ).toThrow();
  });
});

describe("readinessResponseSchema", () => {
  it("accepts not_ready", () => {
    const payload = {
      status: "not_ready",
      service: API_SERVICE_NAME,
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks: { database: "error" },
    } as const;
    expect(readinessResponseSchema.parse(payload).status).toBe("not_ready");
  });
});

describe("apiErrorSchema", () => {
  it("requires code and message", () => {
    expect(() => apiErrorSchema.parse({ error: { code: "X" } })).toThrow();
    expect(apiErrorSchema.parse({ error: { code: "X", message: "boom" } }).error.code).toBe("X");
  });
});
