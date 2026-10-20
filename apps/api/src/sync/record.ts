import { syncChanges, type Db } from "@study-os/db";

export interface ChangeInput {
  userId: string;
  spaceId: string;
  entityType: "task" | "note";
  entityId: string;
  operation: "create" | "update" | "delete";
  version?: number;
}

/** Appends to the incremental sync log. Callers already verified permissions. */
export async function recordChange(db: Db, input: ChangeInput): Promise<void> {
  await db.insert(syncChanges).values({
    userId: input.userId,
    spaceId: input.spaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    version: input.version,
  });
}
