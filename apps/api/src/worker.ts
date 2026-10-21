import { fileURLToPath } from "node:url";

import { createDb, createPool } from "@study-os/db";
import { config as loadEnv } from "dotenv";

import { dispatchDueNotifications } from "./notifications/dispatch";
import { createDigest, digestCandidates } from "./notifications/preferences";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[worker] DATABASE_URL is required");
  process.exit(1);
}

const pool = createPool(connectionString);
const db = createDb(pool);

async function tick(): Promise<void> {
  try {
    const candidates = await digestCandidates(db);
    for (const userId of candidates) {
      const digest = await createDigest(db, userId);
      if (digest) console.log(`[worker] digest queued for ${userId}`);
    }
    const result = await dispatchDueNotifications(db);
    if (result.sent > 0 || result.skipped > 0) {
      console.log(
        `[worker] sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`,
      );
    }
  } catch (error) {
    console.error("[worker] dispatch failed", error);
  }
}

const interval = setInterval(() => void tick(), 30_000);
console.log("[worker] started; dispatching due notifications every 30s");
void tick();

const shutdown = async (): Promise<void> => {
  clearInterval(interval);
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
