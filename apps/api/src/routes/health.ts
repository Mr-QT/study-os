import type { FastifyPluginAsync } from "fastify";

import {
  API_SERVICE_NAME,
  healthResponseSchema,
  readinessResponseSchema,
} from "@study-os/contracts";

import { checkDatabase } from "../db";

export interface HealthRouteOptions {
  version: string;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (app, options) => {
  const startedAt = Date.now();

  app.get("/health", async () => {
    const database = await checkDatabase(app.database);
    return healthResponseSchema.parse({
      status: database === "error" ? "degraded" : "ok",
      service: API_SERVICE_NAME,
      version: options.version,
      uptimeSeconds: (Date.now() - startedAt) / 1000,
      timestamp: new Date().toISOString(),
      checks: { database },
    });
  });

  app.get("/ready", async (_request, reply) => {
    const database = await checkDatabase(app.database);
    const ready = database !== "error";
    const body = readinessResponseSchema.parse({
      status: ready ? "ready" : "not_ready",
      service: API_SERVICE_NAME,
      version: options.version,
      timestamp: new Date().toISOString(),
      checks: { database },
    });
    return reply.code(ready ? 200 : 503).send(body);
  });
};
