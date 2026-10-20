import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import { apiErrorCodes } from "@study-os/contracts";

import { createAiProvider, type AiProvider } from "./ai/provider";
import type { ApiConfig } from "./config";
import { openDatabase } from "./db";
import { sendError } from "./http/errors";
import { aiRoutes } from "./routes/ai";
import { authRoutes } from "./routes/auth";
import { calendarRoutes } from "./routes/calendar";
import { learningRoutes } from "./routes/courses";
import { fileRoutes } from "./routes/files";
import { focusRoutes } from "./routes/focus";
import { healthRoutes } from "./routes/health";
import { learningLogRoutes } from "./routes/learning-log";
import { noteRoutes } from "./routes/notes";
import { questionRoutes } from "./routes/questions";
import { spaceRoutes } from "./routes/spaces";
import { statsRoutes } from "./routes/stats";
import { syncRoutes } from "./routes/sync";
import { taskRoutes } from "./routes/tasks";

export interface AppDependencies {
  aiProvider?: AiProvider | null;
}

export async function buildApp(
  config: ApiConfig,
  options: FastifyServerOptions = {},
  deps: AppDependencies = {},
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
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(cookie, {
    secret: config.sessionSecret,
  });
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
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
  await app.register(aiRoutes, {
    provider: deps.aiProvider === undefined ? createAiProvider(config) : deps.aiProvider,
    budgetUsd: config.aiBudgetUsd ?? 5,
    costPer1kUsd: config.aiCostPer1kUsd ?? 0.002,
  });
  await app.register(authRoutes, { secureCookies: config.secureCookies });
  await app.register(spaceRoutes);
  await app.register(learningRoutes);
  await app.register(taskRoutes);
  await app.register(calendarRoutes);
  await app.register(noteRoutes);
  await app.register(focusRoutes);
  await app.register(fileRoutes, { storageDir: config.storageDir });
  await app.register(learningLogRoutes);
  await app.register(syncRoutes);
  await app.register(statsRoutes);
  await app.register(questionRoutes);

  return app;
}
