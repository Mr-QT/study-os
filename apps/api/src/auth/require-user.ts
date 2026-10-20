import type { FastifyReply, FastifyRequest } from "fastify";

import { eq } from "drizzle-orm";

import { users, type UserRow } from "@study-os/db";

import { readSession } from "../auth/session";
import { serviceUnavailable, unauthorized } from "../http/errors";

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<UserRow | null> {
  const database = request.server.database;
  if (!database) {
    serviceUnavailable(reply);
    return null;
  }

  const userId = readSession(request);
  if (!userId) {
    unauthorized(reply);
    return null;
  }

  const [user] = await database.db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    unauthorized(reply);
    return null;
  }

  return user;
}
