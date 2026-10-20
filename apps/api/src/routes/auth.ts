import type { FastifyPluginAsync } from "fastify";

import { and, eq, isNull } from "drizzle-orm";

import { authSessionResponseSchema } from "@study-os/contracts";
import { memberships, spaces, users, type Db, type SpaceRow } from "@study-os/db";

import { readSession, setSession } from "../auth/session";
import { toSpaceDto, toUserDto } from "../dto";
import { serviceUnavailable, unauthorized } from "../http/errors";

export interface AuthRouteOptions {
  secureCookies: boolean;
}

async function listSpacesForUser(db: Db, userId: string): Promise<SpaceRow[]> {
  const rows = await db
    .select({ space: spaces })
    .from(spaces)
    .innerJoin(memberships, eq(memberships.spaceId, spaces.id))
    .where(and(eq(memberships.userId, userId), isNull(spaces.deletedAt)));
  return rows.map((row) => row.space);
}

export const authRoutes: FastifyPluginAsync<AuthRouteOptions> = async (app, options) => {
  app.post("/api/v1/auth/guest", async (request, reply) => {
    const database = app.database;
    if (!database) return serviceUnavailable(reply);

    const existingId = readSession(request);
    if (existingId) {
      const [existing] = await database.db
        .select()
        .from(users)
        .where(eq(users.id, existingId))
        .limit(1);
      if (existing) {
        const rows = await listSpacesForUser(database.db, existing.id);
        return authSessionResponseSchema.parse({
          user: toUserDto(existing),
          spaces: rows.map(toSpaceDto),
        });
      }
    }

    const created = await database.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ displayName: "学习者" }).returning();
      if (!user) throw new Error("failed to create guest user");

      const [space] = await tx
        .insert(spaces)
        .values({ ownerId: user.id, name: "我的学习空间" })
        .returning();
      if (!space) throw new Error("failed to create default space");

      await tx.insert(memberships).values({ spaceId: space.id, userId: user.id, role: "owner" });
      return { user, space };
    });

    setSession(reply, created.user.id, options.secureCookies);
    return authSessionResponseSchema.parse({
      user: toUserDto(created.user),
      spaces: [toSpaceDto(created.space)],
    });
  });

  app.get("/api/v1/auth/me", async (request, reply) => {
    const database = app.database;
    if (!database) return serviceUnavailable(reply);

    const userId = readSession(request);
    if (!userId) return unauthorized(reply);

    const [user] = await database.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return unauthorized(reply);

    const rows = await listSpacesForUser(database.db, user.id);
    return authSessionResponseSchema.parse({
      user: toUserDto(user),
      spaces: rows.map(toSpaceDto),
    });
  });
};
