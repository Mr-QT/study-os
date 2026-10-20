import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import { apiErrorCodes } from "@study-os/contracts";

import type { ApiConfig } from "./config";
import { openDatabase } from "./db";
import { sendError } from "./http/errors";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { spaceRoutes } from "./routes/spaces";

export async function buildApp(
  config: ApiConfig,
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    ...options,
  });

  const database = config.databaseUrl ? openDatabase(config.databaseUrl) : null;
  app.decorate("database", database);
  app.addHook("onClose", async () => {
    await database?.pool.end();
  });

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
  });
  await app.register(cookie, {
    secret: config.sessionSecret,
  });

  app.setNotFoundHandler((request, reply) =>
    sendError(
      reply,
      404,
      apiErrorCodes.notFound,
      `Route ${request.method} ${request.url} not found`,
    ),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "request failed");
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    return sendError(
      reply,
      statusCode,
      statusCode >= 500 ? apiErrorCodes.internal : "REQUEST_ERROR",
      statusCode >= 500 ? "Internal server error" : error.message,
      { retryable: statusCode >= 500 },
    );
  });

  await app.register(healthRoutes, { version: config.version });
  await app.register(authRoutes, { secureCookies: config.secureCookies });
  await app.register(spaceRoutes);

  return app;
}
