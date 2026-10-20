import { and, eq } from "drizzle-orm";

import { memberships, type Db, type MembershipRow } from "@study-os/db";

export async function findMembership(
  db: Db,
  spaceId: string,
  userId: string,
): Promise<MembershipRow | null> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.spaceId, spaceId), eq(memberships.userId, userId)))
    .limit(1);
  return row ?? null;
}

export type SpaceAccess = "ok" | "not_found" | "forbidden";

/**
 * Space-scoped authorization. Non-members get "not_found" so the API never
 * reveals whether another user's space exists.
 */
export async function ensureSpaceAccess(
  db: Db,
  userId: string,
  spaceId: string,
  write: boolean,
): Promise<SpaceAccess> {
  const membership = await findMembership(db, spaceId, userId);
  if (!membership) return "not_found";
  if (write && membership.role === "viewer") return "forbidden";
  return "ok";
}
