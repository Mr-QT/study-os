import { describe, expect, it } from "vitest";

import {
  API_SERVICE_NAME,
  apiErrorSchema,
  createSpaceInputSchema,
  healthResponseSchema,
  readinessResponseSchema,
  spaceSchema,
  updateSpaceInputSchema,
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
    expect(() => apiErrorSchema.parse({ code: "X" })).toThrow();
  });

  it("accepts the flat contract envelope", () => {
    const parsed = apiErrorSchema.parse({
      code: "X",
      message: "boom",
      correlationId: "req-1",
      retryable: true,
    });
    expect(parsed.code).toBe("X");
    expect(parsed.retryable).toBe(true);
  });
});

describe("space contracts", () => {
  const validSpace = {
    id: "3f1f4c2e-8a1e-4f3b-9f0e-2b6c8d9a1b2c",
    name: "高等数学",
    ownerId: "7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    parentId: null,
    privacyLevel: "personal",
    syncPolicy: "synced",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as const;

  it("validates a space DTO", () => {
    expect(spaceSchema.parse(validSpace).name).toBe("高等数学");
  });

  it("rejects an unknown privacy level", () => {
    expect(() => spaceSchema.parse({ ...validSpace, privacyLevel: "public" })).toThrow();
  });

  it("trims and validates create input", () => {
    expect(createSpaceInputSchema.parse({ name: "  离散数学  " }).name).toBe("离散数学");
    expect(() => createSpaceInputSchema.parse({ name: "" })).toThrow();
  });

  it("requires at least one field on update", () => {
    expect(() => updateSpaceInputSchema.parse({})).toThrow();
    expect(updateSpaceInputSchema.parse({ name: "新名字" }).name).toBe("新名字");
  });
});
