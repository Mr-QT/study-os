import type { FastifyPluginAsync } from "fastify";

import { and, eq, isNull } from "drizzle-orm";

import {
  apiErrorCodes,
  createSpaceInputSchema,
  spaceIdParamSchema,
  spaceListResponseSchema,
  spaceResponseSchema,
  updateSpaceInputSchema,
} from "@study-os/contracts";
import { memberships, spaces } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { toSpaceDto } from "../dto";
import { forbidden, notFound, sendError, validationError } from "../http/errors";

export const spaceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/spaces", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const rows = await database.db
      .select({ space: spaces })
      .from(spaces)
      .innerJoin(memberships, eq(memberships.spaceId, spaces.id))
      .where(and(eq(memberships.userId, user.id), isNull(spaces.deletedAt)));

    return spaceListResponseSchema.parse({ spaces: rows.map((row) => toSpaceDto(row.space)) });
  });

  app.post("/api/v1/spaces", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createSpaceInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const parentId = parsed.data.parentId ?? null;
    if (parentId) {
      const [parentMembership] = await database.db
        .select()
        .from(memberships)
        .where(and(eq(memberships.spaceId, parentId), eq(memberships.userId, user.id)))
        .limit(1);
      if (!parentMembership) return notFound(reply, "父空间不存在");
    }

    const created = await database.db.transaction(async (tx) => {
      const [space] = await tx
        .insert(spaces)
        .values({
          ownerId: user.id,
          name: parsed.data.name,
          parentId,
          privacyLevel: parsed.data.privacyLevel ?? "personal",
        })
        .returning();
      if (!space) throw new Error("failed to create space");
      await tx.insert(memberships).values({ spaceId: space.id, userId: user.id, role: "owner" });
      return space;
    });

    return reply.code(201).send(spaceResponseSchema.parse({ space: toSpaceDto(created) }));
  });

  app.get("/api/v1/spaces/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = spaceIdParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [row] = await database.db
      .select({ space: spaces })
      .from(spaces)
      .innerJoin(memberships, eq(memberships.spaceId, spaces.id))
      .where(
        and(
          eq(spaces.id, params.data.id),
          eq(memberships.userId, user.id),
          isNull(spaces.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return notFound(reply);
    return spaceResponseSchema.parse({ space: toSpaceDto(row.space) });
  });

  app.patch("/api/v1/spaces/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = spaceIdParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const parsed = updateSpaceInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [membership] = await database.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.spaceId, params.data.id), eq(memberships.userId, user.id)))
      .limit(1);

    if (!membership) return notFound(reply);
    if (membership.role === "viewer") return forbidden(reply);

    const [updated] = await database.db
      .update(spaces)
      .set({
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
        ...(parsed.data.privacyLevel === undefined
          ? {}
          : { privacyLevel: parsed.data.privacyLevel }),
        updatedAt: new Date(),
      })
      .where(and(eq(spaces.id, params.data.id), isNull(spaces.deletedAt)))
      .returning();

    if (!updated) return sendError(reply, 404, apiErrorCodes.notFound, "空间不存在");
    return spaceResponseSchema.parse({ space: toSpaceDto(updated) });
  });
};
