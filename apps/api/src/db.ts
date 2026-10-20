import type { CheckState } from "@study-os/contracts";
import { createDb, createPool, type Db } from "@study-os/db";
import type { Pool } from "pg";

const CHECK_TIMEOUT_MS = 1500;

export interface DatabaseHandle {
  db: Db;
  pool: Pool;
}

export function openDatabase(connectionString: string): DatabaseHandle {
  const pool = createPool(connectionString);
  return { db: createDb(pool), pool };
}

/**
 * Verifies the PostgreSQL dependency. An unconfigured instance reports
 * "disabled" and stays healthy, so the skeleton runs without a database.
 */
export async function checkDatabase(database: DatabaseHandle | null): Promise<CheckState> {
  if (!database) return "disabled";

  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("database health check timed out")), CHECK_TIMEOUT_MS);
    });
    await Promise.race([database.pool.query("select 1"), timeout]);
    return "ok";
  } catch {
    return "error";
  }
}
