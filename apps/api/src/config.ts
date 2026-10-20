export interface ApiConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigins: string[];
  databaseUrl: string | undefined;
  sessionSecret: string;
  secureCookies: boolean;
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
    version: env.npm_package_version?.trim() || "0.1.0",
  };
}
