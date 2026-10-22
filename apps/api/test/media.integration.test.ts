import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authSessionResponseSchema, mediaTextResponseSchema } from "@study-os/contracts";

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

function multipart(filename: string, mime: string, data: Buffer) {
  const boundary = `----studyos${Date.now()}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    payload: Buffer.concat([head, data, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

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

describe.skipIf(!databaseUrl)("stage 5.3: local media endpoints", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";

  beforeAll(async () => {
    app = await buildApp(
      config,
      { logger: false },
      {
        media: {
          ocr: async (buffer) => `OCR:${buffer.toString("utf8").slice(0, 20)}`,
          transcribe: async (buffer) => `ASR:${buffer.length} bytes`,
          ocrModel: "stub-ocr",
          asrModel: "stub-asr",
        },
      },
    );
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  it("runs OCR on an uploaded image", async () => {
    const form = multipart("note.png", "image/png", Buffer.from("fake-image-bytes"));
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/media/ocr?spaceId=${spaceId}`,
      headers: { cookie, "content-type": form.contentType },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(200);
    const body = mediaTextResponseSchema.parse(response.json());
    expect(body.kind).toBe("ocr");
    expect(body.text).toContain("OCR:");
    expect(body.model).toBe("stub-ocr");
  });

  it("rejects unsupported media types", async () => {
    const form = multipart("note.txt", "text/plain", Buffer.from("hello"));
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/media/ocr?spaceId=${spaceId}`,
      headers: { cookie, "content-type": form.contentType },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(400);
  });

  it("transcribes an uploaded WAV", async () => {
    const form = multipart("audio.wav", "audio/wav", Buffer.alloc(320));
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/media/transcribe?spaceId=${spaceId}`,
      headers: { cookie, "content-type": form.contentType },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(200);
    const body = mediaTextResponseSchema.parse(response.json());
    expect(body.text).toContain("ASR:");
    expect(body.model).toBe("stub-asr");
  });

  it("hides media endpoints from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const form = multipart("note.png", "image/png", Buffer.from("x"));
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/media/ocr?spaceId=${spaceId}`,
      headers: { cookie: cookieHeader(other), "content-type": form.contentType },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(404);
  });
});
