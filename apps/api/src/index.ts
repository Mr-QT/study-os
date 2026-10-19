import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

import { buildApp } from "./app";
import { loadConfig } from "./config";

// Optional repo-root .env for local development; real process env always wins.
loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const config = loadConfig();
const app = await buildApp(config);

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error, "failed to start API");
  process.exit(1);
}
