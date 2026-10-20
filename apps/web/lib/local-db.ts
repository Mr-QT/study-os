import type { SpaceDto } from "@study-os/contracts";
import Dexie, { type Table } from "dexie";

export interface CachedSpace extends SpaceDto {
  cachedAt: string;
}

class StudyOsLocalDb extends Dexie {
  spaces!: Table<CachedSpace, string>;

  constructor() {
    super("study-os");
    this.version(1).stores({
      spaces: "id, updatedAt",
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
