import type { SyncPushResult } from "@study-os/contracts";
import type { SpaceDto } from "@study-os/contracts";
import Dexie, { type Table } from "dexie";

import { API_BASE_URL } from "./api";

export interface CachedSpace extends SpaceDto {
  cachedAt: string;
}

export interface OutboxOperation {
  id?: number;
  opId: string;
  spaceId: string;
  entityType: "task" | "note";
  entityId: string;
  action: "patch" | "delete";
  patch: Record<string, unknown>;
  baseVersion?: number;
  createdAt: string;
}

class StudyOsLocalDb extends Dexie {
  spaces!: Table<CachedSpace, string>;
  outbox!: Table<OutboxOperation, number>;

  constructor() {
    super("study-os");
    this.version(1).stores({
      spaces: "id, updatedAt",
    });
    this.version(2).stores({
      spaces: "id, updatedAt",
      outbox: "++id, opId, spaceId, entityId",
    });
  }
}

const db = new StudyOsLocalDb();

/** Mirrors the last known spaces into IndexedDB so the shell can render offline. */
export async function cacheSpaces(spaces: SpaceDto[]): Promise<void> {
  const cachedAt = new Date().toISOString();
  await db.spaces.bulkPut(spaces.map((space) => ({ ...space, cachedAt })));
}

export async function readCachedSpaces(): Promise<CachedSpace[]> {
  return db.spaces.toArray();
}

/** Coalesces repeated edits to the same entity into one pending operation. */
export async function enqueueOperation(
  operation: Omit<OutboxOperation, "id" | "opId" | "createdAt"> & { opId?: string },
): Promise<void> {
  const existing = await db.outbox
    .where("spaceId")
    .equals(operation.spaceId)
    .filter((item) => item.entityId === operation.entityId && item.action === operation.action)
    .first();

  if (existing?.id !== undefined) {
    await db.outbox.update(existing.id, {
      patch: { ...existing.patch, ...operation.patch },
      baseVersion: existing.baseVersion ?? operation.baseVersion,
    });
    return;
  }

  await db.outbox.add({
    ...operation,
    opId: operation.opId ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
}

export async function pendingOperations(spaceId: string): Promise<OutboxOperation[]> {
  return db.outbox.where("spaceId").equals(spaceId).toArray();
}

export async function pendingCount(spaceId: string): Promise<number> {
  return db.outbox.where("spaceId").equals(spaceId).count();
}

export async function removeOperations(ids: number[]): Promise<void> {
  if (ids.length > 0) await db.outbox.bulkDelete(ids);
}

export interface FlushResult {
  flushed: number;
  conflicts: number;
  failed: boolean;
}

/** Pushes queued offline edits through the sync API and clears them on response. */
export async function flushOutbox(spaceId: string): Promise<FlushResult> {
  const operations = await pendingOperations(spaceId);
  if (operations.length === 0) return { flushed: 0, conflicts: 0, failed: false };

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/sync/push`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        spaceId,
        operations: operations.map((operation) => ({
          opId: operation.opId,
          entityType: operation.entityType,
          entityId: operation.entityId,
          action: operation.action,
          patch: operation.patch,
          ...(operation.baseVersion === undefined ? {} : { baseVersion: operation.baseVersion }),
        })),
      }),
    });

    if (!response.ok) return { flushed: 0, conflicts: 0, failed: true };

    const body = (await response.json()) as SyncPushResult;
    const ids = operations
      .map((operation) => operation.id)
      .filter((id): id is number => typeof id === "number");
    await removeOperations(ids);

    return {
      flushed: operations.length,
      conflicts: body.results.filter((result) => result.status === "conflict").length,
      failed: false,
    };
  } catch {
    return { flushed: 0, conflicts: 0, failed: true };
  }
}
