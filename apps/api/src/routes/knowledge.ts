import type { FastifyPluginAsync } from "fastify";

import { and, eq, ilike, isNull, or } from "drizzle-orm";

import {
  createPdfAnnotationInputSchema,
  pdfAnnotationListResponseSchema,
  pdfAnnotationSchema,
  searchResponseSchema,
  spaceQuerySchema,
} from "@study-os/contracts";
import { fileAssets, notes, pdfAnnotations, questions, type PdfAnnotationRow } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

function toAnnotationDto(row: PdfAnnotationRow) {
  return pdfAnnotationSchema.parse({
    id: row.id,
    fileId: row.fileId,
    page: row.page,
    rect: row.rect,
    note: row.note,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
  });
}

export const knowledgeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/search", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    const q = (request.query as { q?: string }).q?.trim() ?? "";
    if (q.length < 1) return validationError(reply, { message: "q 不能为空" });
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const pattern = `%${q}%`;
    const noteRows = await database.db
      .select({ id: notes.id, title: notes.title })
      .from(notes)
      .where(
        and(
          eq(notes.spaceId, query.data.spaceId),
          isNull(notes.deletedAt),
          or(ilike(notes.title, pattern), ilike(notes.contentMd, pattern)),
        ),
      )
      .limit(10);

    const questionRows = await database.db
      .select({ id: questions.id, prompt: questions.prompt })
      .from(questions)
      .where(
        and(
          eq(questions.spaceId, query.data.spaceId),
          isNull(questions.deletedAt),
          or(ilike(questions.prompt, pattern), ilike(questions.answer, pattern)),
        ),
      )
      .limit(10);

    return searchResponseSchema.parse({ notes: noteRows, questions: questionRows });
  });

  app.get("/api/v1/pdf-annotations", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    const fileId = (request.query as { fileId?: string }).fileId;
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const conditions = [eq(pdfAnnotations.spaceId, query.data.spaceId)];
    if (fileId) conditions.push(eq(pdfAnnotations.fileId, fileId));
    const rows = await database.db
      .select()
      .from(pdfAnnotations)
      .where(and(...conditions));
    return pdfAnnotationListResponseSchema.parse({
      annotations: rows.map(toAnnotationDto),
    });
  });

  app.post("/api/v1/pdf-annotations", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createPdfAnnotationInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const [file] = await database.db
      .select()
      .from(fileAssets)
      .where(
        and(
          eq(fileAssets.id, parsed.data.fileId),
          eq(fileAssets.spaceId, parsed.data.spaceId),
          isNull(fileAssets.deletedAt),
        ),
      )
      .limit(1);
    if (!file) return notFound(reply, "文件不存在");

    const [annotation] = await database.db
      .insert(pdfAnnotations)
      .values({
        spaceId: parsed.data.spaceId,
        fileId: file.id,
        userId: user.id,
        page: parsed.data.page,
        rect: parsed.data.rect ?? null,
        note: parsed.data.note ?? null,
        color: parsed.data.color ?? "#F5D7CE",
      })
      .returning();
    if (!annotation) return reply;
    return reply.code(201).send({ annotation: toAnnotationDto(annotation) });
  });
};
