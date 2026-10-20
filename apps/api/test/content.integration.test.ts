import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  fileListResponseSchema,
  fileResponseSchema,
  focusSessionListResponseSchema,
  focusSessionResponseSchema,
  learningLogResponseSchema,
  noteListResponseSchema,
  noteResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";

const databaseUrl = process.env.DATABASE_URL;

interface CookieCarrier {
  cookies: Array<{ name: string; value: string }>;
}

function cookieHeader(response: CookieCarrier): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie) throw new Error("session cookie missing");
  return `${SESSION_COOKIE}=${cookie.value}`;
}

function multipartBody(
  boundary: string,
  filename: string,
  mime: string,
  content: Buffer,
): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}

describe.skipIf(!databaseUrl)("milestone 1.3: notes, focus, files and learning log", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let storageDir = "";
  let noteId = "";
  let fileId = "";

  beforeAll(async () => {
    storageDir = await mkdtemp(path.join(os.tmpdir(), "study-os-storage-"));
    const config: ApiConfig = {
      host: "127.0.0.1",
      port: 0,
      logLevel: "silent",
      corsOrigins: [],
      databaseUrl,
      sessionSecret: "test-session-secret",
      secureCookies: false,
      storageDir,
      version: "0.1.0",
    };
    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  it("creates, updates and lists a markdown note", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: { cookie },
      payload: { spaceId, title: "极限的定义", contentMd: "# 极限\n\n- ε-δ 语言" },
    });
    expect(created.statusCode).toBe(201);
    const note = noteResponseSchema.parse(created.json()).note;
    noteId = note.id;
    expect(note.contentMd).toContain("ε-δ");

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/notes/${noteId}`,
      headers: { cookie },
      payload: { contentMd: "# 极限\n\n更新后的内容", version: note.version },
    });
    expect(updated.statusCode).toBe(200);
    expect(noteResponseSchema.parse(updated.json()).note.version).toBe(2);

    const stale = await app.inject({
      method: "PATCH",
      url: `/api/v1/notes/${noteId}`,
      headers: { cookie },
      payload: { title: "旧版本", version: 1 },
    });
    expect(stale.statusCode).toBe(409);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/notes?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(noteListResponseSchema.parse(list.json()).notes).toHaveLength(1);
  });

  it("handles focus sessions and rejects a second open session", async () => {
    const startedAt = new Date(Date.now() - 120_000).toISOString();
    const started = await app.inject({
      method: "POST",
      url: "/api/v1/focus/sessions",
      headers: { cookie },
      payload: { spaceId, startedAt },
    });
    expect(started.statusCode).toBe(201);
    const session = focusSessionResponseSchema.parse(started.json()).session;

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/focus/sessions",
      headers: { cookie },
      payload: { spaceId },
    });
    expect(second.statusCode).toBe(409);

    const stopped = await app.inject({
      method: "PATCH",
      url: `/api/v1/focus/sessions/${session.id}/stop`,
      headers: { cookie },
      payload: { note: "完成了两道题" },
    });
    expect(stopped.statusCode).toBe(200);
    const finished = focusSessionResponseSchema.parse(stopped.json()).session;
    expect(finished.durationSeconds).toBeGreaterThanOrEqual(110);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/focus/sessions?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(focusSessionListResponseSchema.parse(list.json()).sessions).toHaveLength(1);
  });

  it("aggregates a learning log from finished sessions", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/learning-logs?spaceId=${spaceId}&days=7`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = learningLogResponseSchema.parse(response.json());
    expect(body.days.length).toBeGreaterThan(0);
    expect(body.days[0]?.minutes).toBeGreaterThanOrEqual(1);
  });

  it("uploads, lists, downloads and deletes a file", async () => {
    const boundary = `----studyos${Date.now()}`;
    const content = Buffer.from("# 课堂笔记\n\n文件内容", "utf8");
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/files?spaceId=${spaceId}`,
      headers: { cookie, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, "note.md", "text/markdown", content),
    });
    expect(upload.statusCode).toBe(201);
    const file = fileResponseSchema.parse(upload.json()).file;
    fileId = file.id;
    expect(file.sizeBytes).toBe(content.byteLength);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/files?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(fileListResponseSchema.parse(list.json()).files).toHaveLength(1);

    const download = await app.inject({
      method: "GET",
      url: `/api/v1/files/${fileId}/content`,
      headers: { cookie },
    });
    expect(download.statusCode).toBe(200);
    expect(download.rawPayload.equals(content)).toBe(true);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/v1/files/${fileId}`,
      headers: { cookie },
    });
    expect(deleted.statusCode).toBe(204);
  });

  it("rejects disallowed file types", async () => {
    const boundary = `----studyos${Date.now()}`;
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/files?spaceId=${spaceId}`,
      headers: { cookie, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, "evil.exe", "application/x-msdownload", Buffer.from("x")),
    });
    expect(upload.statusCode).toBe(400);
  });

  it("hides notes and files from other users", async () => {
    const guestB = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const cookieB = cookieHeader(guestB);

    const note = await app.inject({
      method: "GET",
      url: `/api/v1/notes/${noteId}`,
      headers: { cookie: cookieB },
    });
    expect(note.statusCode).toBe(404);

    const notes = await app.inject({
      method: "GET",
      url: `/api/v1/notes?spaceId=${spaceId}`,
      headers: { cookie: cookieB },
    });
    expect(notes.statusCode).toBe(404);
  });
});
