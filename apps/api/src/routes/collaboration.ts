import { randomUUID } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import {
  commentListResponseSchema,
  commentQuerySchema,
  commentResponseSchema,
  commentSchema,
  createCommentInputSchema,
  createInviteInputSchema,
  idParamSchema,
  joinInviteResponseSchema,
  memberListResponseSchema,
  spaceInviteListResponseSchema,
  spaceInviteResponseSchema,
  spaceInviteSchema,
  updateMemberRoleInputSchema,
  type CommentDto,
  type SpaceInviteDto,
} from "@study-os/contracts";
import {
  comments,
  exams,
  memberships,
  notes,
  questions,
  spaceInvites,
  spaces,
  tasks,
  users,
  type CommentRow,
  type Db,
  type SpaceInviteRow,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess, findMembership } from "../auth/space-access";
import { forbidden, notFound, sendError, validationError } from "../http/errors";
import { apiErrorCodes } from "@study-os/contracts";

async function isOwner(db: Db, userId: string, spaceId: string): Promise<boolean> {
  const [space] = await db
    .select({ ownerId: spaces.ownerId })
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);
  return space?.ownerId === userId;
}

function toInviteDto(row: SpaceInviteRow): SpaceInviteDto {
  return spaceInviteSchema.parse({
    id: row.id,
    spaceId: row.spaceId,
    token: row.token,
    role: row.role === "owner" ? "editor" : row.role,
    expiresAt: row.expiresAt.toISOString(),
    maxUses: row.maxUses,
    uses: row.uses,
    createdAt: row.createdAt.toISOString(),
  });
}

function toCommentDto(row: CommentRow, authorName: string): CommentDto {
  return commentSchema.parse({
    id: row.id,
    spaceId: row.spaceId,
    entityType: row.entityType,
    entityId: row.entityId,
    userId: row.userId,
    authorName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  });
}

async function entityBelongsToSpace(
  db: Db,
  spaceId: string,
  entityType: "task" | "note" | "question" | "exam",
  entityId: string,
): Promise<boolean> {
  const table =
    entityType === "task"
      ? tasks
      : entityType === "note"
        ? notes
        : entityType === "question"
          ? questions
          : exams;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, entityId), eq(table.spaceId, spaceId)))
    .limit(1);
  return Boolean(row);
}

export const collaborationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/spaces/:id/members", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, params.data.id, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select({
        userId: memberships.userId,
        role: memberships.role,
        createdAt: memberships.createdAt,
        displayName: users.displayName,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.spaceId, params.data.id))
      .orderBy(memberships.createdAt);
    return memberListResponseSchema.parse({
      members: rows.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        role: row.role,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });

  app.patch("/api/v1/spaces/:id/members/:userId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const body = request.body as { role?: string; userId?: string } | undefined;
    const targetUserId = (request.params as { userId?: string }).userId ?? body?.userId ?? "";
    const parsed = updateMemberRoleInputSchema.safeParse(body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if (!(await isOwner(database.db, user.id, params.data.id))) {
      return forbidden(reply);
    }

    const target = await findMembership(database.db, params.data.id, targetUserId);
    if (!target) return notFound(reply);
    if (target.role === "owner") {
      return sendError(reply, 409, apiErrorCodes.conflict, "不能修改空间所有者的角色");
    }

    await database.db
      .update(memberships)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(memberships.spaceId, params.data.id),
          eq(memberships.userId, targetUserId),
        ),
      );
    const [row] = await database.db
      .select({
        userId: memberships.userId,
        role: memberships.role,
        createdAt: memberships.createdAt,
        displayName: users.displayName,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(eq(memberships.spaceId, params.data.id), eq(memberships.userId, targetUserId)),
      )
      .limit(1);
    if (!row) return notFound(reply);
    return {
      member: {
        userId: row.userId,
        displayName: row.displayName,
        role: row.role,
        createdAt: row.createdAt.toISOString(),
      },
    };
  });

  app.delete("/api/v1/spaces/:id/members/:userId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const targetUserId = (request.params as { userId?: string }).userId ?? "";
    if (!(await isOwner(database.db, user.id, params.data.id))) {
      return forbidden(reply);
    }
    const target = await findMembership(database.db, params.data.id, targetUserId);
    if (!target) return notFound(reply);
    if (target.role === "owner") {
      return sendError(reply, 409, apiErrorCodes.conflict, "不能移除空间所有者");
    }
    await database.db
      .delete(memberships)
      .where(
        and(eq(memberships.spaceId, params.data.id), eq(memberships.userId, targetUserId)),
      );
    return reply.code(204).send();
  });

  app.post("/api/v1/spaces/:id/invites", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    if (!(await isOwner(database.db, user.id, params.data.id))) {
      return forbidden(reply);
    }
    const parsed = createInviteInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [invite] = await database.db
      .insert(spaceInvites)
      .values({
        spaceId: params.data.id,
        token: randomUUID().replace(/-/g, ""),
        role: parsed.data.role,
        createdBy: user.id,
        expiresAt: new Date(Date.now() + (parsed.data.expiresInHours ?? 72) * 3_600_000),
        maxUses: parsed.data.maxUses ?? 1,
      })
      .returning();
    if (!invite) return reply;
    return reply.code(201).send(spaceInviteResponseSchema.parse({ invite: toInviteDto(invite) }));
  });

  app.get("/api/v1/spaces/:id/invites", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    if (!(await isOwner(database.db, user.id, params.data.id))) {
      return forbidden(reply);
    }
    const rows = await database.db
      .select()
      .from(spaceInvites)
      .where(
        and(
          eq(spaceInvites.spaceId, params.data.id),
          gt(spaceInvites.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(spaceInvites.createdAt));
    return spaceInviteListResponseSchema.parse({ invites: rows.map(toInviteDto) });
  });

  app.delete("/api/v1/spaces/:id/invites/:inviteId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const inviteId = (request.params as { inviteId?: string }).inviteId ?? "";
    if (!(await isOwner(database.db, user.id, params.data.id))) {
      return forbidden(reply);
    }
    const deleted = await database.db
      .delete(spaceInvites)
      .where(and(eq(spaceInvites.id, inviteId), eq(spaceInvites.spaceId, params.data.id)))
      .returning();
    if (deleted.length === 0) return notFound(reply);
    return reply.code(204).send();
  });

  app.post("/api/v1/invites/:token/join", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const token = (request.params as { token?: string }).token ?? "";
    const [invite] = await database.db
      .select()
      .from(spaceInvites)
      .where(eq(spaceInvites.token, token))
      .limit(1);
    if (!invite) return notFound(reply);
    if (invite.expiresAt <= new Date() || invite.uses >= invite.maxUses) {
      return sendError(reply, 410, apiErrorCodes.conflict, "邀请已过期或已用完");
    }

    const existing = await findMembership(database.db, invite.spaceId, user.id);
    if (existing) {
      return joinInviteResponseSchema.parse({ spaceId: invite.spaceId, role: existing.role });
    }

    await database.db.insert(memberships).values({
      spaceId: invite.spaceId,
      userId: user.id,
      role: invite.role,
      invitedBy: invite.createdBy,
    });
    await database.db
      .update(spaceInvites)
      .set({ uses: sql`${spaceInvites.uses} + 1` })
      .where(eq(spaceInvites.id, invite.id));
    return joinInviteResponseSchema.parse({ spaceId: invite.spaceId, role: invite.role });
  });

  app.get("/api/v1/comments", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = commentQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const conditions = [eq(comments.spaceId, query.data.spaceId), isNull(comments.deletedAt)];
    if (query.data.entityType) conditions.push(eq(comments.entityType, query.data.entityType));
    if (query.data.entityId) conditions.push(eq(comments.entityId, query.data.entityId));
    const rows = await database.db
      .select({ comment: comments, displayName: users.displayName })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(and(...conditions))
      .orderBy(comments.createdAt);
    return commentListResponseSchema.parse({
      comments: rows.map((row) => toCommentDto(row.comment, row.displayName)),
    });
  });

  app.post("/api/v1/comments", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createCommentInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return forbidden(reply);
    }

    const entityType = parsed.data.entityType ?? "space";
    if (entityType === "space") {
      if (parsed.data.entityId !== parsed.data.spaceId) {
        return validationError(reply, { message: "空间评论的 entityId 必须等于 spaceId" });
      }
    } else if (
      !(await entityBelongsToSpace(
        database.db,
        parsed.data.spaceId,
        entityType,
        parsed.data.entityId,
      ))
    ) {
      return notFound(reply);
    }

    const [comment] = await database.db
      .insert(comments)
      .values({
        spaceId: parsed.data.spaceId,
        entityType,
        entityId: parsed.data.entityId,
        userId: user.id,
        body: parsed.data.body,
      })
      .returning();
    if (!comment) return reply;
    return reply
      .code(201)
      .send(commentResponseSchema.parse({ comment: toCommentDto(comment, user.displayName) }));
  });

  app.delete("/api/v1/comments/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [comment] = await database.db
      .select()
      .from(comments)
      .where(and(eq(comments.id, params.data.id), isNull(comments.deletedAt)))
      .limit(1);
    if (!comment) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, comment.spaceId, true)) !== "ok") {
      return notFound(reply);
    }
    if (comment.userId !== user.id && !(await isOwner(database.db, user.id, comment.spaceId))) {
      return forbidden(reply);
    }
    await database.db
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(eq(comments.id, comment.id));
    return reply.code(204).send();
  });
};
