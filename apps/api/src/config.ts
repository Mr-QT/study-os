import path from "node:path";

export interface ApiConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigins: string[];
  databaseUrl: string | undefined;
  sessionSecret: string;
  secureCookies: boolean;
  storageDriver?: "local" | "s3";
  storageDir: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3ForcePathStyle?: boolean;
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
  const storageDriver = (env.STORAGE_DRIVER?.trim().toLowerCase() || "local") as
    | "local"
    | "s3";
  if (storageDriver !== "local" && storageDriver !== "s3") {
    throw new Error(`Invalid STORAGE_DRIVER "${storageDriver}": expected local or s3`);
  }
  const s3Bucket = env.S3_BUCKET?.trim() || undefined;
  const s3Region = env.S3_REGION?.trim() || undefined;
  const s3AccessKeyId = env.S3_ACCESS_KEY_ID?.trim() || undefined;
  const s3SecretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim() || undefined;
  if (storageDriver === "s3" && (!s3Bucket || !s3Region || !s3AccessKeyId || !s3SecretAccessKey)) {
    throw new Error(
      "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
    );
  }
  return {
    host: env.API_HOST?.trim() || "127.0.0.1",
    port: parsePort(env.API_PORT),
    logLevel: env.LOG_LEVEL?.trim() || "info",
    corsOrigins: parseOrigins(env.CORS_ORIGINS, isProduction ? [] : DEVELOPMENT_ORIGINS),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    sessionSecret: parseSessionSecret(env.SESSION_SECRET, isProduction),
    secureCookies: isProduction,
    storageDriver,
    storageDir: env.STORAGE_DIR?.trim() || path.join(process.cwd(), "storage", "uploads"),
    s3Bucket,
    s3Region,
    s3Endpoint: env.S3_ENDPOINT?.trim() || undefined,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3ForcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
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
