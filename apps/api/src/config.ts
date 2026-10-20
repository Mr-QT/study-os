import path from "node:path";

export interface ApiConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigins: string[];
  databaseUrl: string | undefined;
  sessionSecret: string;
  secureCookies: boolean;
  storageDir: string;
  aiProvider?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
  aiBudgetUsd?: number;
  aiCostPer1kUsd?: number;
  version: string;
}

const DEFAULT_PORT = 4000;
const DEV_SESSION_SECRET = "study-os-dev-only-session-secret";

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_PORT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error(`Invalid API_PORT "${raw}": expected an integer between 0 and 65535`);
  }
  return value;
}

function parseOrigins(raw: string | undefined, fallback: string[]): string[] {
  if (raw === undefined || raw.trim() === "") return fallback;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseSessionSecret(raw: string | undefined, isProduction: boolean): string {
  const secret = raw?.trim();
  if (isProduction) {
    if (!secret || secret.length < 16) {
      throw new Error("SESSION_SECRET must be set and at least 16 characters in production");
    }
    return secret;
  }
  return secret && secret.length > 0 ? secret : DEV_SESSION_SECRET;
}

const DEVELOPMENT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const isProduction = env.NODE_ENV === "production";
  return {
    host: env.API_HOST?.trim() || "127.0.0.1",
    port: parsePort(env.API_PORT),
    logLevel: env.LOG_LEVEL?.trim() || "info",
    corsOrigins: parseOrigins(env.CORS_ORIGINS, isProduction ? [] : DEVELOPMENT_ORIGINS),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    sessionSecret: parseSessionSecret(env.SESSION_SECRET, isProduction),
    secureCookies: isProduction,
    storageDir: env.STORAGE_DIR?.trim() || path.join(process.cwd(), "storage", "uploads"),
    aiProvider: (env.AI_PROVIDER?.trim().toLowerCase() || "disabled"),
    aiBaseUrl:
      env.AI_BASE_URL?.trim() ||
      ((env.AI_PROVIDER?.trim().toLowerCase() === "ollama")
        ? "http://127.0.0.1:11434"
        : "https://api.openai.com/v1"),
    aiApiKey: env.AI_API_KEY?.trim() || undefined,
    aiModel:
      env.AI_MODEL?.trim() ||
      ((env.AI_PROVIDER?.trim().toLowerCase() === "ollama") ? "llama3.1" : "gpt-4o-mini"),
    aiBudgetUsd: Number(env.AI_MONTHLY_BUDGET_USD ?? "5"),
    aiCostPer1kUsd: Number(env.AI_COST_PER_1K_USD ?? "0.002"),
    version: env.npm_package_version?.trim() || "0.1.0",
  };
}
