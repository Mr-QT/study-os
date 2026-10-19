import type { CheckState } from "@study-os/contracts";

const CHECK_TIMEOUT_MS = 1500;

/**
 * Verifies the PostgreSQL dependency when DATABASE_URL is configured.
 * Phase 0 has no database requirement: an unconfigured instance reports
 * "disabled" and stays healthy, so the skeleton runs without Docker.
 */
export async function checkDatabase(databaseUrl: string | undefined): Promise<CheckState> {
  if (!databaseUrl) return "disabled";

  let client: { query: (sql: string) => Promise<unknown>; release: () => void } | undefined;
  try {
    const pg = await import("pg");
    const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: CHECK_TIMEOUT_MS });
    client = await pool.connect();
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("database health check timed out")), CHECK_TIMEOUT_MS);
    });
    await Promise.race([client.query("select 1"), timeout]);
    return "ok";
  } catch {
    return "error";
  } finally {
    client?.release();
  }
}
