import { createHash } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq, inArray } from "drizzle-orm";

import {
  importBatchListResponseSchema,
  importBatchSchema,
  importCommitResponseSchema,
  importPreviewInputSchema,
  importPreviewResponseSchema,
  importRollbackResponseSchema,
  idParamSchema,
  spaceQuerySchema,
  type ImportBatchDto,
} from "@study-os/contracts";
import {
  importBatches,
  importItems,
  questions,
  tasks,
  type ImportBatchRow,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { previewRows } from "../import/csv";
import { notFound, sendError, validationError } from "../http/errors";
import { apiErrorCodes } from "@study-os/contracts";

function toBatchDto(row: ImportBatchRow): ImportBatchDto {
  return importBatchSchema.parse({
    id: row.id,
    kind: row.kind,
    filename: row.filename,
    status: row.status,
    totalRows: row.totalRows,
    validRows: row.validRows,
    invalidRows: row.invalidRows,
    sha256: row.sha256,
    createdAt: row.createdAt.toISOString(),
    committedAt: row.committedAt?.toISOString() ?? null,
    rolledBackAt: row.rolledBackAt?.toISOString() ?? null,
  });
}

export const importRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/v1/imports/preview", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = importPreviewInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const rows = previewRows(parsed.data.kind, parsed.data.csv);
    if (rows.length === 0) {
      return validationError(reply, { message: "CSV 没有数据行（第一行必须是表头）" });
    }
    const validRows = rows.filter((row) => row.valid).length;

    const [batch] = await database.db
      .insert(importBatches)
      .values({
        spaceId: parsed.data.spaceId,
        userId: user.id,
        kind: parsed.data.kind,
        filename: parsed.data.filename ?? "import.csv",
        rawCsv: parsed.data.csv,
        sha256: createHash("sha256").update(parsed.data.csv).digest("hex"),
        totalRows: rows.length,
        validRows,
        invalidRows: rows.length - validRows,
      })
      .returning();
    if (!batch) return reply;

    await database.db.insert(importItems).values(
      rows.map((row) => ({
        batchId: batch.id,
        rowNumber: row.rowNumber,
        status: row.valid ? ("pending" as const) : ("skipped" as const),
        payload: JSON.stringify(row.payload ?? {}),
        error: row.error,
      })),
    );

    return importPreviewResponseSchema.parse({
      batch: toBatchDto(batch),
      rows: rows.map((row) => ({
        rowNumber: row.rowNumber,
        values: row.values,
        valid: row.valid,
        error: row.error,
      })),
    });
  });

  app.get("/api/v1/imports", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select()
      .from(importBatches)
      .where(
        and(eq(importBatches.spaceId, query.data.spaceId), eq(importBatches.userId, user.id)),
      )
      .orderBy(desc(importBatches.createdAt));
    return importBatchListResponseSchema.parse({ batches: rows.map(toBatchDto) });
  });

  app.get("/api/v1/imports/:id/original", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [batch] = await database.db
      .select()
      .from(importBatches)
      .where(and(eq(importBatches.id, params.data.id), eq(importBatches.userId, user.id)))
      .limit(1);
    if (!batch) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, batch.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    return reply
      .type("text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="original-${batch.id}.csv"`)
      .header("x-content-sha256", batch.sha256)
      .send(batch.rawCsv);
  });

  app.post("/api/v1/imports/:id/commit", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [batch] = await database.db
      .select()
      .from(importBatches)
      .where(and(eq(importBatches.id, params.data.id), eq(importBatches.userId, user.id)))
      .limit(1);
    if (!batch) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, batch.spaceId, true)) !== "ok") {
      return notFound(reply);
    }
    if (batch.status !== "previewed") {
      return sendError(reply, 409, apiErrorCodes.conflict, "该批次已提交或已回滚");
    }

    const items = await database.db
      .select()
      .from(importItems)
      .where(and(eq(importItems.batchId, batch.id), eq(importItems.status, "pending")));

    let created = 0;
    let skipped = 0;
    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload) as Record<string, string>;
        if (batch.kind === "tasks") {
          const [task] = await database.db
            .insert(tasks)
            .values({
              spaceId: batch.spaceId,
              title: payload.title ?? "未命名任务",
              notes: payload.notes ?? null,
              status:
                payload.status === "done" || payload.status === "archived"
                  ? payload.status
                  : payload.status === "in_progress"
                    ? "in_progress"
                    : "todo",
              dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
            })
            .returning();
          if (!task) throw new Error("insert failed");
          await database.db
            .update(importItems)
            .set({ status: "created", entityId: task.id })
            .where(eq(importItems.id, item.id));
        } else {
          const [question] = await database.db
            .insert(questions)
            .values({
              spaceId: batch.spaceId,
              prompt: payload.prompt ?? "未命名题目",
              answer: payload.answer ?? "",
              explanation: payload.explanation ?? null,
            })
            .returning();
          if (!question) throw new Error("insert failed");
          await database.db
            .update(importItems)
            .set({ status: "created", entityId: question.id })
            .where(eq(importItems.id, item.id));
        }
        created += 1;
      } catch {
        skipped += 1;
        await database.db
          .update(importItems)
          .set({ status: "failed", error: "创建失败" })
          .where(eq(importItems.id, item.id));
      }
    }

    const [updated] = await database.db
      .update(importBatches)
      .set({ status: "committed", committedAt: new Date() })
      .where(eq(importBatches.id, batch.id))
      .returning();
    if (!updated) return reply;
    return importCommitResponseSchema.parse({
      batch: toBatchDto(updated),
      created,
      skipped,
    });
  });

  app.post("/api/v1/imports/:id/rollback", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [batch] = await database.db
      .select()
      .from(importBatches)
      .where(and(eq(importBatches.id, params.data.id), eq(importBatches.userId, user.id)))
      .limit(1);
    if (!batch) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, batch.spaceId, true)) !== "ok") {
      return notFound(reply);
    }
    if (batch.status !== "committed") {
      return sendError(reply, 409, apiErrorCodes.conflict, "只有已提交批次可以回滚");
    }

    const items = await database.db
      .select()
      .from(importItems)
      .where(and(eq(importItems.batchId, batch.id), eq(importItems.status, "created")));
    const entityIds = items
      .map((item) => item.entityId)
      .filter((id): id is string => typeof id === "string");
    let deleted = 0;
    if (entityIds.length > 0) {
      if (batch.kind === "tasks") {
        const rows = await database.db
          .update(tasks)
          .set({ deletedAt: new Date() })
          .where(and(inArray(tasks.id, entityIds), eq(tasks.spaceId, batch.spaceId)))
          .returning({ id: tasks.id });
        deleted = rows.length;
      } else {
        const rows = await database.db
          .update(questions)
          .set({ deletedAt: new Date() })
          .where(and(inArray(questions.id, entityIds), eq(questions.spaceId, batch.spaceId)))
          .returning({ id: questions.id });
        deleted = rows.length;
      }
    }

    const [updated] = await database.db
      .update(importBatches)
      .set({ status: "rolled_back", rolledBackAt: new Date() })
      .where(eq(importBatches.id, batch.id))
      .returning();
    if (!updated) return reply;
    return importRollbackResponseSchema.parse({
      batch: toBatchDto(updated),
      deleted,
    });
  });
};
