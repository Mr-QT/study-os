import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://studyos:studyos@127.0.0.1:5432/studyos",
  },
  strict: true,
  verbose: true,
});
