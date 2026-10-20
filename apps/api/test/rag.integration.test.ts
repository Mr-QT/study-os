import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  ragReindexResponseSchema,
  semanticSearchResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";
import type { Embedder } from "../src/rag/embedder";

const databaseUrl = process.env.DATABASE_URL;

interface CookieCarrier {
  cookies: Array<{ name: string; value: string }>;
}

function cookieHeader(response: CookieCarrier): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie) throw new Error("session cookie missing");
  return `${SESSION_COOKIE}=${cookie.value}`;
}

const stubEmbedder: Embedder = async (texts) =>
  texts.map((text) => [
    text.includes("极限") ? 1 : 0,
    text.includes("导数") ? 1 : 0,
    text.length % 7 === 0 ? 0.3 : 0.1,
  ]);

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  logLevel: "silent",
  corsOrigins: [],
  databaseUrl,
  sessionSecret: "test-session-secret",
  secureCookies: false,
  storageDir: "test-storage",
  version: "0.1.0",
};

describe.skipIf(!databaseUrl)("local RAG: chunking, indexing and semantic search", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let noteId = "";
  let noteTitle = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false }, { embedder: stubEmbedder });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";

    noteTitle = `极限笔记-${Date.now()}`;
    const note = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: { cookie },
      payload: {
        spaceId,
        title: noteTitle,
        contentMd: "极限的 ε-δ 定义：当自变量趋近某值时函数值趋近的确定值。",
      },
    });
    noteId = (note.json() as { note: { id: string } }).note.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("reindexes a space and finds the note semantically", async () => {
    const reindex = await app.inject({
      method: "POST",
      url: "/api/v1/rag/reindex",
      headers: { cookie },
      payload: { spaceId },
    });
    expect(reindex.statusCode).toBe(200);
    const stats = ragReindexResponseSchema.parse(reindex.json());
    expect(stats.notes).toBeGreaterThanOrEqual(1);
    expect(stats.chunks).toBeGreaterThanOrEqual(1);

    const search = await app.inject({
      method: "GET",
      url: `/api/v1/search/semantic?spaceId=${spaceId}&q=${encodeURIComponent("极限")}`,
      headers: { cookie },
    });
    expect(search.statusCode).toBe(200);
    const results = semanticSearchResponseSchema.parse(search.json()).results;
    expect(results.some((result) => result.sourceId === noteId)).toBe(true);
  });

  it("hides semantic search from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/search/semantic?spaceId=${spaceId}&q=极限`,
      headers: { cookie: cookieHeader(other) },
    });
    expect(response.statusCode).toBe(404);
  });
});
