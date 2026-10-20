import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { and, eq, isNull } from "drizzle-orm";

import {
  apiErrorCodes,
  createNoteInputSchema,
  idParamSchema,
  noteListResponseSchema,
  noteResponseSchema,
  spaceQuerySchema,
  updateNoteInputSchema,
} from "@study-os/contracts";
import { courses, notes, type Db, type UserRow } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { toNoteDto } from "../dto";
import { notFound, sendError, validationError } from "../http/errors";
import { recordChange } from "../sync/record";

async function authorize(
  db: Db,
  user: UserRow,
  spaceId: string,
  write: boolean,
  reply: FastifyReply,
): Promise<"ok" | "sent"> {
  const access = await ensureSpaceAccess(db, user.id, spaceId, write);
  if (access !== "ok") {
    notFound(reply);
    return "sent";
  }
  return "ok";
}

export const noteRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/notes", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await authorize(database.db, user, query.data.spaceId, false, reply)) === "sent") {
      return reply;
    }

    const rows = await database.db
      .select()
      .from(notes)
      .where(and(eq(notes.spaceId, query.data.spaceId), isNull(notes.deletedAt)));
    return noteListResponseSchema.parse({ notes: rows.map(toNoteDto) });
  });

  app.post("/api/v1/notes", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createNoteInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await authorize(database.db, user, parsed.data.spaceId, true, reply)) === "sent") {
      return reply;
    }

    if (parsed.data.courseId) {
      const [course] = await database.db
        .select()
        .from(courses)
        .where(
          and(
            eq(courses.id, parsed.data.courseId),
            eq(courses.spaceId, parsed.data.spaceId),
            isNull(courses.deletedAt),
          ),
        )
        .limit(1);
      if (!course) return notFound(reply, "课程不存在");
    }

    const [note] = await database.db
      .insert(notes)
      .values({
        spaceId: parsed.data.spaceId,
        courseId: parsed.data.courseId ?? null,
        title: parsed.data.title,
        contentMd: parsed.data.contentMd ?? "",
      })
      .returning();
    if (!note) return reply;
    await recordChange(database.db, {
      userId: user.id,
      spaceId: note.spaceId,
      entityType: "note",
      entityId: note.id,
      operation: "create",
      version: note.version,
    });
    return reply.code(201).send(noteResponseSchema.parse({ note: toNoteDto(note) }));
  });

  app.get("/api/v1/notes/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [note] = await database.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, params.data.id), isNull(notes.deletedAt)))
      .limit(1);
    if (!note) return notFound(reply);
    if ((await authorize(database.db, user, note.spaceId, false, reply)) === "sent") {
      return reply;
    }
    return noteResponseSchema.parse({ note: toNoteDto(note) });
  });

  app.patch("/api/v1/notes/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateNoteInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, params.data.id), isNull(notes.deletedAt)))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await authorize(database.db, user, existing.spaceId, true, reply)) === "sent") {
      return reply;
    }

    if (parsed.data.version !== undefined && parsed.data.version !== existing.version) {
      return sendError(reply, 409, apiErrorCodes.conflict, "笔记已被其他操作修改，请刷新后重试", {
        details: { currentVersion: existing.version },
        retryable: true,
      });
    }

    const { version: _version, ...changes } = parsed.data;
    const [updated] = await database.db
      .update(notes)
      .set({
        ...(changes.title === undefined ? {} : { title: changes.title }),
        ...(changes.contentMd === undefined ? {} : { contentMd: changes.contentMd }),
        ...(changes.courseId === undefined ? {} : { courseId: changes.courseId }),
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    await recordChange(database.db, {
      userId: user.id,
      spaceId: updated.spaceId,
      entityType: "note",
      entityId: updated.id,
      operation: "update",
      version: updated.version,
    });
    return noteResponseSchema.parse({ note: toNoteDto(updated) });
  });

  app.delete("/api/v1/notes/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [existing] = await database.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, params.data.id), isNull(notes.deletedAt)))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await authorize(database.db, user, existing.spaceId, true, reply)) === "sent") {
      return reply;
    }

    await database.db
      .update(notes)
      .set({ deletedAt: new Date(), updatedAt: new Date(), version: existing.version + 1 })
      .where(eq(notes.id, existing.id));
    await recordChange(database.db, {
      userId: user.id,
      spaceId: existing.spaceId,
      entityType: "note",
      entityId: existing.id,
      operation: "delete",
      version: existing.version + 1,
    });
    return reply.code(204).send();
  });
};
