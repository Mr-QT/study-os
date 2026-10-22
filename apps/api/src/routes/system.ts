import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { FastifyPluginAsync } from "fastify";

import { sql } from "drizzle-orm";

import { systemStatusSchema } from "@study-os/contracts";

async function latestBackup(): Promise<{ name: string; bytes: number; createdAt: string } | null> {
  const candidates = [
    process.env.BACKUP_DIR,
    path.join(process.cwd(), "backups"),
    path.join(process.cwd(), "..", "..", "backups"),
  ].filter((item): item is string => Boolean(item));

  for (const directory of candidates) {
    try {
      const files = (await readdir(directory)).filter(
        (name) => name.startsWith("studyos-") && name.endsWith(".dump"),
      );
      if (files.length === 0) continue;
      const stats = await Promise.all(
        files.map(async (name) => ({ name, info: await stat(path.join(directory, name)) })),
      );
      stats.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs);
      const newest = stats[0];
      if (!newest) continue;
      return {
        name: newest.name,
        bytes: newest.info.size,
        createdAt: newest.info.mtime.toISOString(),
      };
    } catch {
      // Try the next location.
    }
  }
  return null;
}

export interface SystemRouteOptions {
  version: string;
}

export const systemRoutes: FastifyPluginAsync<SystemRouteOptions> = async (app, options) => {
  app.get("/api/v1/system/status", async (request, _reply) => {
    const database = request.server.database;
    let databaseStatus: "ok" | "unavailable" = "unavailable";
    let appliedMigrations = 0;

    if (database) {
      try {
        await database.db.execute(sql`select 1`);
        const result = (await database.db.execute(
          sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
        )) as unknown as { rows?: Array<{ count: number }> };
        appliedMigrations = Number(result.rows?.[0]?.count ?? 0);
        databaseStatus = "ok";
      } catch {
        databaseStatus = "unavailable";
      }
    }

    return systemStatusSchema.parse({
      version: options.version,
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      database: databaseStatus,
      appliedMigrations,
      latestBackup: await latestBackup(),
      checkedAt: new Date().toISOString(),
    });
  });
};
