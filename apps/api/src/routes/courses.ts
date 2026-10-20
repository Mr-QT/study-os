import type { FastifyPluginAsync } from "fastify";

import { and, eq, isNull } from "drizzle-orm";

import {
  courseListResponseSchema,
  courseResponseSchema,
  createCourseInputSchema,
  createTermInputSchema,
  idParamSchema,
  spaceQuerySchema,
  termListResponseSchema,
  termResponseSchema,
  updateCourseInputSchema,
} from "@study-os/contracts";
import { courses, terms, type Db } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { toCourseDto, toTermDto } from "../dto";
import { forbidden, notFound, validationError } from "../http/errors";
import type { UserRow } from "@study-os/db";

async function check(
  db: Db,
  user: UserRow,
  spaceId: string,
  write: boolean,
  reply: Parameters<typeof notFound>[0],
): Promise<"ok" | "sent"> {
  const access = await ensureSpaceAccess(db, user.id, spaceId, write);
  if (access === "not_found") {
    notFound(reply);
    return "sent";
  }
  if (access === "forbidden") {
    forbidden(reply);
    return "sent";
  }
  return "ok";
}

export const learningRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/terms", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await check(database.db, user, query.data.spaceId, false, reply)) === "sent") return reply;

    const rows = await database.db
      .select()
      .from(terms)
      .where(eq(terms.spaceId, query.data.spaceId));
    return termListResponseSchema.parse({ terms: rows.map(toTermDto) });
  });

  app.post("/api/v1/terms", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createTermInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await check(database.db, user, parsed.data.spaceId, true, reply)) === "sent") return reply;

    const [term] = await database.db
      .insert(terms)
      .values({
        spaceId: parsed.data.spaceId,
        name: parsed.data.name,
        startsOn: parsed.data.startsOn,
        endsOn: parsed.data.endsOn,
      })
      .returning();
    if (!term) return reply;
    return reply.code(201).send(termResponseSchema.parse({ term: toTermDto(term) }));
  });

  app.get("/api/v1/courses", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await check(database.db, user, query.data.spaceId, false, reply)) === "sent") return reply;

    const rows = await database.db
      .select()
      .from(courses)
      .where(and(eq(courses.spaceId, query.data.spaceId), isNull(courses.deletedAt)));
    return courseListResponseSchema.parse({ courses: rows.map(toCourseDto) });
  });

  app.post("/api/v1/courses", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createCourseInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await check(database.db, user, parsed.data.spaceId, true, reply)) === "sent") return reply;

    if (parsed.data.termId) {
      const [term] = await database.db
        .select()
        .from(terms)
        .where(and(eq(terms.id, parsed.data.termId), eq(terms.spaceId, parsed.data.spaceId)))
        .limit(1);
      if (!term) return notFound(reply, "学期不存在");
    }

    const [course] = await database.db
      .insert(courses)
      .values({
        spaceId: parsed.data.spaceId,
        termId: parsed.data.termId ?? null,
        name: parsed.data.name,
        code: parsed.data.code ?? null,
        instructor: parsed.data.instructor ?? null,
      })
      .returning();
    if (!course) return reply;
    return reply.code(201).send(courseResponseSchema.parse({ course: toCourseDto(course) }));
  });

  app.patch("/api/v1/courses/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateCourseInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(courses)
      .where(and(eq(courses.id, params.data.id), isNull(courses.deletedAt)))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await check(database.db, user, existing.spaceId, true, reply)) === "sent") return reply;

    if (parsed.data.termId) {
      const [term] = await database.db
        .select()
        .from(terms)
        .where(and(eq(terms.id, parsed.data.termId), eq(terms.spaceId, existing.spaceId)))
        .limit(1);
      if (!term) return notFound(reply, "学期不存在");
    }

    const [updated] = await database.db
      .update(courses)
      .set({
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
        ...(parsed.data.termId === undefined ? {} : { termId: parsed.data.termId }),
        ...(parsed.data.code === undefined ? {} : { code: parsed.data.code }),
        ...(parsed.data.instructor === undefined ? {} : { instructor: parsed.data.instructor }),
        updatedAt: new Date(),
      })
      .where(eq(courses.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    return courseResponseSchema.parse({ course: toCourseDto(updated) });
  });

  app.delete("/api/v1/courses/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [existing] = await database.db
      .select()
      .from(courses)
      .where(and(eq(courses.id, params.data.id), isNull(courses.deletedAt)))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await check(database.db, user, existing.spaceId, true, reply)) === "sent") return reply;

    await database.db
      .update(courses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(courses.id, existing.id));
    return reply.code(204).send();
  });
};
