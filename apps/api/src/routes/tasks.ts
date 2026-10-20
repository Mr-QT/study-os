import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { and, eq, isNull } from "drizzle-orm";

import {
  apiErrorCodes,
  createTaskInputSchema,
  idParamSchema,
  taskListResponseSchema,
  taskQuerySchema,
  taskResponseSchema,
  updateTaskInputSchema,
} from "@study-os/contracts";
import { courses, tasks, type Db, type UserRow } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { toTaskDto } from "../dto";
import { forbidden, notFound, sendError, validationError } from "../http/errors";
import { recordChange } from "../sync/record";

async function authorize(
  db: Db,
  user: UserRow,
  spaceId: string,
  write: boolean,
  reply: FastifyReply,
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

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/tasks", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = taskQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await authorize(database.db, user, query.data.spaceId, false, reply)) === "sent") {
      return reply;
    }

    const conditions = [eq(tasks.spaceId, query.data.spaceId), isNull(tasks.deletedAt)];
    if (query.data.status) conditions.push(eq(tasks.status, query.data.status));

    const rows = await database.db
      .select()
      .from(tasks)
      .where(and(...conditions));
    return taskListResponseSchema.parse({ tasks: rows.map(toTaskDto) });
  });

  app.post("/api/v1/tasks", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createTaskInputSchema.safeParse(request.body);
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

    const [task] = await database.db
      .insert(tasks)
      .values({
        spaceId: parsed.data.spaceId,
        courseId: parsed.data.courseId ?? null,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
        priority: parsed.data.priority ?? "medium",
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        estimateMinutes: parsed.data.estimateMinutes ?? null,
      })
      .returning();
    if (!task) return reply;
    await recordChange(database.db, {
      userId: user.id,
      spaceId: task.spaceId,
      entityType: "task",
      entityId: task.id,
      operation: "create",
      version: task.version,
    });
    return reply.code(201).send(taskResponseSchema.parse({ task: toTaskDto(task) }));
  });

  app.get("/api/v1/tasks/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [task] = await database.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, params.data.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) return notFound(reply);
    if ((await authorize(database.db, user, task.spaceId, false, reply)) === "sent") {
      return reply;
    }
    return taskResponseSchema.parse({ task: toTaskDto(task) });
  });

  app.patch("/api/v1/tasks/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateTaskInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, params.data.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await authorize(database.db, user, existing.spaceId, true, reply)) === "sent") {
      return reply;
    }

    if (parsed.data.version !== undefined && parsed.data.version !== existing.version) {
      return sendError(reply, 409, apiErrorCodes.conflict, "任务已被其他操作修改，请刷新后重试", {
        details: { currentVersion: existing.version },
        retryable: true,
      });
    }

    if (parsed.data.courseId) {
      const [course] = await database.db
        .select()
        .from(courses)
        .where(
          and(
            eq(courses.id, parsed.data.courseId),
            eq(courses.spaceId, existing.spaceId),
            isNull(courses.deletedAt),
          ),
        )
        .limit(1);
      if (!course) return notFound(reply, "课程不存在");
    }

    const { version: _version, ...changes } = parsed.data;
    const [updated] = await database.db
      .update(tasks)
      .set({
        ...(changes.title === undefined ? {} : { title: changes.title }),
        ...(changes.notes === undefined ? {} : { notes: changes.notes }),
        ...(changes.status === undefined ? {} : { status: changes.status }),
        ...(changes.priority === undefined ? {} : { priority: changes.priority }),
        ...(changes.courseId === undefined ? {} : { courseId: changes.courseId }),
        ...(changes.dueAt === undefined
          ? {}
          : { dueAt: changes.dueAt === null ? null : new Date(changes.dueAt) }),
        ...(changes.estimateMinutes === undefined
          ? {}
          : { estimateMinutes: changes.estimateMinutes }),
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    await recordChange(database.db, {
      userId: user.id,
      spaceId: updated.spaceId,
      entityType: "task",
      entityId: updated.id,
      operation: "update",
      version: updated.version,
    });
    return taskResponseSchema.parse({ task: toTaskDto(updated) });
  });

  app.delete("/api/v1/tasks/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [existing] = await database.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, params.data.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!existing) return notFound(reply);
    if ((await authorize(database.db, user, existing.spaceId, true, reply)) === "sent") {
      return reply;
    }

    await database.db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date(), version: existing.version + 1 })
      .where(eq(tasks.id, existing.id));
    await recordChange(database.db, {
      userId: user.id,
      spaceId: existing.spaceId,
      entityType: "task",
      entityId: existing.id,
      operation: "delete",
      version: existing.version + 1,
    });
    return reply.code(204).send();
  });
};
