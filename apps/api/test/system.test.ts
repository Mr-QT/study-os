import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { systemStatusSchema } from "@study-os/contracts";

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

describe.skipIf(!databaseUrl)("operations: system status", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports version, migrations and latest backup", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/system/status" });
    expect(response.statusCode).toBe(200);
    const status = systemStatusSchema.parse(response.json());
    expect(status.version).toBe("0.1.0");
    expect(status.database).toBe("ok");
    expect(status.appliedMigrations).toBeGreaterThanOrEqual(17);
    expect(status.latestBackup?.name.startsWith("studyos-")).toBe(true);
  });
});
