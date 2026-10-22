import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { mediaTextResponseSchema, spaceQuerySchema } from "@study-os/contracts";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, sendError, validationError } from "../http/errors";
import { apiErrorCodes } from "@study-os/contracts";

const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const AUDIO_MIME = new Set(["audio/wav", "audio/x-wav", "audio/wave"]);

export interface MediaRouteOptions {
  ocr: (buffer: Buffer) => Promise<string>;
  transcribe: (buffer: Buffer) => Promise<string>;
  ocrModel: string;
  asrModel: string;
}

export const mediaRoutes: FastifyPluginAsync<MediaRouteOptions> = async (app, options) => {
  async function readUpload(
    request: FastifyRequest,
    reply: FastifyReply,
    allowed: Set<string>,
  ): Promise<{ buffer: Buffer; mimetype: string } | null> {
    let part;
    try {
      part = await request.file();
    } catch {
      sendError(reply, 413, apiErrorCodes.validation, "文件超过 10MB 限制");
      return null;
    }
    if (!part) {
      validationError(reply, { message: "缺少文件字段" });
      return null;
    }
    if (!allowed.has(part.mimetype)) {
      validationError(reply, { message: `不支持的文件类型：${part.mimetype}` });
      return null;
    }
    return { buffer: await part.toBuffer(), mimetype: part.mimetype };
  }

  app.post("/api/v1/media/ocr", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const upload = await readUpload(request, reply, IMAGE_MIME);
    if (!upload) return reply;
    try {
      const text = await options.ocr(upload.buffer);
      return mediaTextResponseSchema.parse({ kind: "ocr", text, model: options.ocrModel });
    } catch {
      return sendError(reply, 422, apiErrorCodes.validation, "OCR 识别失败，请换一张更清晰的图片");
    }
  });

  app.post("/api/v1/media/transcribe", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const upload = await readUpload(request, reply, AUDIO_MIME);
    if (!upload) return reply;
    try {
      const text = await options.transcribe(upload.buffer);
      return mediaTextResponseSchema.parse({
        kind: "transcribe",
        text,
        model: options.asrModel,
      });
    } catch {
      return sendError(reply, 422, apiErrorCodes.validation, "转写失败，请确认是 16-bit PCM WAV");
    }
  });
};
