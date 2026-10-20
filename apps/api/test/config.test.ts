import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("uses local-first defaults", () => {
    const config = loadConfig({});
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(4000);
    expect(config.databaseUrl).toBeUndefined();
    expect(config.corsOrigins).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
    expect(config.secureCookies).toBe(false);
    expect(config.sessionSecret.length).toBeGreaterThan(0);
  });

  it("accepts port 0 for ephemeral test servers", () => {
    expect(loadConfig({ API_PORT: "0" }).port).toBe(0);
  });

  it("rejects invalid ports with a clear message", () => {
    expect(() => loadConfig({ API_PORT: "abc" })).toThrow(/API_PORT/);
    expect(() => loadConfig({ API_PORT: "70000" })).toThrow(/API_PORT/);
  });

  it("requires a strong session secret in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
    expect(() =>
      loadConfig({ NODE_ENV: "production", SESSION_SECRET: "too-short" }),
    ).toThrow(/SESSION_SECRET/);

    const config = loadConfig({
      NODE_ENV: "production",
      SESSION_SECRET: "a-production-grade-secret-value",
    });
    expect(config.secureCookies).toBe(true);
    expect(config.corsOrigins).toEqual([]);
  });

  it("parses a comma separated origin list", () => {
    expect(
      loadConfig({ CORS_ORIGINS: "https://a.example, https://b.example ," }).corsOrigins,
    ).toEqual(["https://a.example", "https://b.example"]);
  });

  it("treats an empty DATABASE_URL as unset", () => {
    expect(loadConfig({ DATABASE_URL: "   " }).databaseUrl).toBeUndefined();
  });
});
