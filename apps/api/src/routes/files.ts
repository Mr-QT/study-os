import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FastifyPluginAsync } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

import { and, eq, isNull } from "drizzle-orm";

import {
  fileListResponseSchema,
  fileResponseSchema,
  idParamSchema,
  spaceQuerySchema,
} from "@study-os/contracts";
import { fileAssets } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { toFileAssetDto } from "../dto";
import { notFound, sendError, validationError } from "../http/errors";
import { apiErrorCodes } from "@study-os/contracts";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

const MAX_BYTES = 10 * 1024 * 1024;

export interface FileRouteOptions {
  storageDir: string;
}

function safeName(raw: string | undefined): string {
  // eslint-disable-next-line no-control-regex -- strip control characters from uploaded filenames
  const base = path.basename(raw ?? "file").replace(/[\u0000-\u001f]/g, "").trim();
  return (base.length > 0 ? base : "file").slice(0, 200);
}

export const fileRoutes: FastifyPluginAsync<FileRouteOptions> = async (app, options) => {
  app.post("/api/v1/files", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());

    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, true);
    if (access !== "ok") return notFound(reply);

    let part: MultipartFile | undefined;
    try {
      part = await request.file();
    } catch {
      return sendError(reply, 413, apiErrorCodes.validation, "文件超过 10MB 限制");
    }
    if (!part) return validationError(reply, { message: "缺少文件字段" });

    if (!ALLOWED_MIME.has(part.mimetype)) {
      return validationError(reply, {
        message: `不支持的文件类型：${part.mimetype}`,
        allowed: [...ALLOWED_MIME],
      });
    }

    const buffer = await part.toBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return sendError(reply, 413, apiErrorCodes.validation, "文件超过 10MB 限制");
    }

    const name = safeName(part.filename);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const extension = path.extname(name).slice(0, 10);
    const storageKey = `${randomUUID()}${extension}`;

    await mkdir(options.storageDir, { recursive: true });
    await writeFile(path.join(options.storageDir, storageKey), buffer);

    const [asset] = await database.db
      .insert(fileAssets)
      .values({
        spaceId: query.data.spaceId,
        name,
        mime: part.mimetype,
        sizeBytes: buffer.byteLength,
        sha256,
        storageKey,
      })
      .returning();
    if (!asset) return reply;
    return reply.code(201).send(fileResponseSchema.parse({ file: toFileAssetDto(asset) }));
  });

  app.get("/api/v1/files", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    const access = await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false);
    if (access !== "ok") return notFound(reply);

    const rows = await database.db
      .select()
      .from(fileAssets)
      .where(and(eq(fileAssets.spaceId, query.data.spaceId), isNull(fileAssets.deletedAt)));
    return fileListResponseSchema.parse({ files: rows.map(toFileAssetDto) });
  });

  app.get("/api/v1/files/:id/content", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [asset] = await database.db
      .select()
      .from(fileAssets)
      .where(and(eq(fileAssets.id, params.data.id), isNull(fileAssets.deletedAt)))
      .limit(1);
    if (!asset) return notFound(reply);
    const access = await ensureSpaceAccess(database.db, user.id, asset.spaceId, false);
    if (access !== "ok") return notFound(reply);

    try {
      const buffer = await readFile(path.join(options.storageDir, asset.storageKey));
      return reply
        .type(asset.mime)
        .header(
          "content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        )
        .send(buffer);
    } catch {
      return notFound(reply, "文件内容不存在");
    }
  });

  app.delete("/api/v1/files/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [asset] = await database.db
      .select()
      .from(fileAssets)
      .where(and(eq(fileAssets.id, params.data.id), isNull(fileAssets.deletedAt)))
      .limit(1);
    if (!asset) return notFound(reply);
    const access = await ensureSpaceAccess(database.db, user.id, asset.spaceId, true);
    if (access !== "ok") return notFound(reply);

    await database.db
      .update(fileAssets)
      .set({ deletedAt: new Date() })
      .where(eq(fileAssets.id, asset.id));
    return reply.code(204).send();
  });
};
