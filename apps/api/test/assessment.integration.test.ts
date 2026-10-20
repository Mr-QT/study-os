import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  examDetailResponseSchema,
  examListResponseSchema,
  gradesResponseSchema,
  masteryResponseSchema,
  questionResponseSchema,
  searchResponseSchema,
  startExamAttemptResponseSchema,
  submitExamAttemptResponseSchema,
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

describe.skipIf(!databaseUrl)("stage 2 remainder: exams, grades, mastery, search, PDF annotations", () => {
  let app: FastifyInstance;
  let cookie = "";
  let spaceId = "";
  let examId = "";
  let firstQuestionId = "";
  let secondQuestionId = "";
  let noteTitle = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/questions",
      headers: { cookie },
      payload: { spaceId, prompt: "1 + 1 = ?", answer: "2" },
    });
    firstQuestionId = questionResponseSchema.parse(first.json()).question.id;

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/questions",
      headers: { cookie },
      payload: { spaceId, prompt: "2 + 2 = ?", answer: "4" },
    });
    secondQuestionId = questionResponseSchema.parse(second.json()).question.id;

    noteTitle = `检索笔记-${Date.now()}`;
    await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: { cookie },
      payload: { spaceId, title: noteTitle, contentMd: "唯一关键词 zeta-search" },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an exam from questions and exposes it without answers", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/exams",
      headers: { cookie },
      payload: {
        spaceId,
        title: "阶段测验",
        questionIds: [firstQuestionId, secondQuestionId],
      },
    });
    expect(created.statusCode).toBe(201);
    examId = (created.json() as { exam: { id: string } }).exam.id;

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/exams?spaceId=${spaceId}`,
      headers: { cookie },
    });
    expect(examListResponseSchema.parse(list.json()).exams.map((exam) => exam.id)).toContain(examId);

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/exams/${examId}`,
      headers: { cookie },
    });
    const body = examDetailResponseSchema.parse(detail.json());
    expect(body.questions).toHaveLength(2);
    expect((body.questions[0] as Record<string, unknown>).answer).toBeUndefined();
  });

  it("grades a submitted attempt and records grades and mastery", async () => {
    const started = await app.inject({
      method: "POST",
      url: `/api/v1/exams/${examId}/attempts`,
      headers: { cookie },
    });
    expect(started.statusCode).toBe(201);
    const attempt = startExamAttemptResponseSchema.parse(started.json()).attempt;

    const submitted = await app.inject({
      method: "POST",
      url: `/api/v1/exam-attempts/${attempt.id}/submit`,
      headers: { cookie },
      payload: { answers: { [firstQuestionId]: "2", [secondQuestionId]: "wrong" } },
    });
    expect(submitted.statusCode).toBe(200);
    const result = submitExamAttemptResponseSchema.parse(submitted.json());
    expect(result.attempt.score).toBe(1);
    expect(result.percentage).toBe(50);

    const grades = await app.inject({
      method: "GET",
      url: `/api/v1/grades?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const gradeBody = gradesResponseSchema.parse(grades.json());
    expect(gradeBody.grades.some((grade) => grade.examId === examId)).toBe(true);
    expect(gradeBody.averagePercentage).toBeGreaterThanOrEqual(50);

    const mastery = await app.inject({
      method: "GET",
      url: `/api/v1/mastery?spaceId=${spaceId}`,
      headers: { cookie },
    });
    const items = masteryResponseSchema.parse(mastery.json()).items;
    expect(items.find((item) => item.questionId === firstQuestionId)?.accuracy).toBe(100);
    expect(items.find((item) => item.questionId === secondQuestionId)?.accuracy).toBe(0);
  });

  it("searches notes and questions in a space", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/search?spaceId=${spaceId}&q=zeta-search`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = searchResponseSchema.parse(response.json());
    expect(body.notes.map((note) => note.title)).toContain(noteTitle);
  });

  it("stores PDF annotations for an uploaded file", async () => {
    const boundary = `----studyos${Date.now()}`;
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/files?spaceId=${spaceId}`,
      headers: { cookie, "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, "paper.pdf", "application/pdf", Buffer.from("%PDF-1.4 test")),
    });
    expect(upload.statusCode).toBe(201);
    const fileId = (upload.json() as { file: { id: string } }).file.id;

    const annotation = await app.inject({
      method: "POST",
      url: "/api/v1/pdf-annotations",
      headers: { cookie },
      payload: { spaceId, fileId, page: 1, note: "重点", color: "#F5D7CE" },
    });
    expect(annotation.statusCode).toBe(201);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/pdf-annotations?spaceId=${spaceId}&fileId=${fileId}`,
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    expect((list.json() as { annotations: unknown[] }).annotations).toHaveLength(1);
  });

  it("hides exams from other users", async () => {
    const other = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/exams?spaceId=${spaceId}`,
      headers: { cookie: cookieHeader(other) },
    });
    expect(response.statusCode).toBe(404);
  });
});
