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
import { createLocalEmbedder, type Embedder } from "./rag/embedder";
import { createStorage } from "./storage/adapter";
import type { ApiConfig } from "./config";
import { openDatabase } from "./db";
import { sendError } from "./http/errors";
import { aiRoutes } from "./routes/ai";
import { agentRoutes } from "./routes/agents";
import { analyticsRoutes } from "./routes/analytics";
import { assessmentRoutes } from "./routes/assessment";
import { authRoutes } from "./routes/auth";
import { automationRoutes } from "./routes/automation";
import { calendarRoutes } from "./routes/calendar";
import { collaborationRoutes } from "./routes/collaboration";
import { learningRoutes } from "./routes/courses";
import { fileRoutes } from "./routes/files";
import { focusRoutes } from "./routes/focus";
import { growthRoutes } from "./routes/growth";
import { healthRoutes } from "./routes/health";
import { importRoutes } from "./routes/imports";
import { knowledgeRoutes } from "./routes/knowledge";
import { learningLogRoutes } from "./routes/learning-log";
import { memoryRoutes } from "./routes/memories";
import { extractRoutes } from "./routes/extract";
import { notificationPreferenceRoutes } from "./routes/notification-preferences";
import { planRoutes } from "./routes/plans";
import { noteRoutes } from "./routes/notes";
import { questionRoutes } from "./routes/questions";
import { ragRoutes } from "./routes/rag";
import { ruleDraftRoutes } from "./routes/rule-draft";
import { spaceRoutes } from "./routes/spaces";
import { statsRoutes } from "./routes/stats";
import { systemRoutes } from "./routes/system";
import { syncRoutes } from "./routes/sync";
import { ocrImage } from "./media/ocr";
import { transcribeAudio } from "./media/transcribe";
import { mediaRoutes } from "./routes/media";
import { metricsRoutes } from "./routes/metrics";
import { taskRoutes } from "./routes/tasks";
import { tutorRoutes } from "./routes/tutor";
import { webhookRoutes } from "./routes/webhooks";

export interface AppDependencies {
  aiProvider?: AiProvider | null;
  embedder?: Embedder;
  media?: {
    ocr: (buffer: Buffer) => Promise<string>;
    transcribe: (buffer: Buffer) => Promise<string>;
    ocrModel: string;
    asrModel: string;
  };
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
  await app.register(systemRoutes, { version: config.version });
  await app.register(metricsRoutes);
  const aiProvider = deps.aiProvider === undefined ? createAiProvider(config) : deps.aiProvider;
  const aiOptions = {
    provider: aiProvider,
    budgetUsd: config.aiBudgetUsd ?? 5,
    costPer1kUsd: config.aiCostPer1kUsd ?? 0.002,
  };
  const storage = createStorage({
    driver: config.storageDriver ?? "local",
    directory: config.storageDir,
    s3:
      config.s3Bucket && config.s3Region && config.s3AccessKeyId && config.s3SecretAccessKey
        ? {
            bucket: config.s3Bucket,
            region: config.s3Region,
            endpoint: config.s3Endpoint,
            accessKeyId: config.s3AccessKeyId,
            secretAccessKey: config.s3SecretAccessKey,
            forcePathStyle: config.s3ForcePathStyle,
          }
        : undefined,
  });
  const media = deps.media ?? {
    ocr: ocrImage,
    transcribe: transcribeAudio,
    ocrModel: process.env.OCR_MODEL ?? "tesseract.js-eng",
    asrModel: process.env.ASR_MODEL ?? "Xenova/whisper-tiny",
  };
  await app.register(aiRoutes, aiOptions);
  await app.register(tutorRoutes, aiOptions);
  await app.register(agentRoutes, aiOptions);
  await app.register(planRoutes, aiOptions);
  await app.register(extractRoutes, aiOptions);
  await app.register(ruleDraftRoutes, aiOptions);
  await app.register(authRoutes, { secureCookies: config.secureCookies });
  await app.register(spaceRoutes);
  await app.register(learningRoutes);
  await app.register(taskRoutes);
  await app.register(calendarRoutes);
  await app.register(collaborationRoutes);
  await app.register(webhookRoutes);
  await app.register(growthRoutes);
  await app.register(importRoutes);
  await app.register(mediaRoutes, media);
  await app.register(notificationPreferenceRoutes);
  await app.register(noteRoutes);
  await app.register(focusRoutes);
  await app.register(fileRoutes, { storage });
  await app.register(learningLogRoutes);
  await app.register(syncRoutes);
  await app.register(statsRoutes);
  await app.register(questionRoutes);
  await app.register(assessmentRoutes);
  await app.register(automationRoutes);
  await app.register(knowledgeRoutes);
  await app.register(memoryRoutes);
  await app.register(analyticsRoutes);
  await app.register(ragRoutes, {
    embedder: deps.embedder ?? createLocalEmbedder(),
  });

  return app;
}
