import cors from "@fastify/cors";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import { apiErrorCodes } from "@study-os/contracts";

import type { ApiConfig } from "./config";
import { healthRoutes } from "./routes/health";

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

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: apiErrorCodes.notFound,
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
      },
    }),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "request failed");
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.code(statusCode).send({
      error: {
        code: statusCode >= 500 ? apiErrorCodes.internal : "REQUEST_ERROR",
        message: statusCode >= 500 ? "Internal server error" : error.message,
        requestId: request.id,
      },
    });
  });

  await app.register(healthRoutes, {
    version: config.version,
    databaseUrl: config.databaseUrl,
  });

  return app;
}
