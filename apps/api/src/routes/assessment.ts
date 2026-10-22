import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  createExamInputSchema,
  examDetailResponseSchema,
  examListResponseSchema,
  examPublicQuestionSchema,
  gradesResponseSchema,
  idParamSchema,
  masteryResponseSchema,
  spaceQuerySchema,
  startExamAttemptResponseSchema,
  submitExamAttemptInputSchema,
  submitExamAttemptResponseSchema,
  type ExamDto,
} from "@study-os/contracts";
import {
  examAttempts,
  examQuestions,
  exams,
  questionAttempts,
  questions,
  type ExamAttemptRow,
  type ExamRow,
  type QuestionRow,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { runAutomations } from "../automation/engine";
import { queueWebhooks } from "../webhooks/dispatch";
import { notFound, validationError } from "../http/errors";

function toExamDto(row: ExamRow): ExamDto {
  return {
    id: row.id,
    spaceId: row.spaceId,
    courseId: row.courseId,
    title: row.title,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    durationMinutes: row.durationMinutes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function publicQuestion(question: QuestionRow, points: number) {
  let options: string[] | null = null;
  if (question.options) {
    try {
      const parsed: unknown = JSON.parse(question.options);
      if (Array.isArray(parsed)) options = parsed.filter((item): item is string => typeof item === "string");
    } catch {
      options = null;
    }
  }
  return examPublicQuestionSchema.parse({
    id: question.id,
    prompt: question.prompt,
    kind: question.kind,
    options,
    points,
  });
}

function toAttemptDto(row: ExamAttemptRow) {
  return {
    id: row.id,
    examId: row.examId,
    startedAt: row.startedAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    score: row.score,
    maxScore: row.maxScore,
  };
}

export const assessmentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/exams", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select()
      .from(exams)
      .where(and(eq(exams.spaceId, query.data.spaceId), isNull(exams.deletedAt)));
    return examListResponseSchema.parse({ exams: rows.map(toExamDto) });
  });

  app.post("/api/v1/exams", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createExamInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const questionRows = await database.db
      .select()
      .from(questions)
      .where(
        and(
          inArray(questions.id, parsed.data.questionIds),
          eq(questions.spaceId, parsed.data.spaceId),
          isNull(questions.deletedAt),
        ),
      );
    if (questionRows.length !== parsed.data.questionIds.length) {
      return notFound(reply, "题目不存在或不属于该空间");
    }

    const created = await database.db.transaction(async (tx) => {
      const [exam] = await tx
        .insert(exams)
        .values({
          spaceId: parsed.data.spaceId,
          courseId: parsed.data.courseId ?? null,
          title: parsed.data.title,
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
          durationMinutes: parsed.data.durationMinutes ?? null,
        })
        .returning();
      if (!exam) throw new Error("failed to create exam");
      await tx.insert(examQuestions).values(
        parsed.data.questionIds.map((questionId, index) => ({
          examId: exam.id,
          questionId,
          position: index,
          points: 1,
        })),
      );
      return exam;
    });

    return reply.code(201).send({ exam: toExamDto(created) });
  });

  app.get("/api/v1/exams/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [exam] = await database.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, params.data.id), isNull(exams.deletedAt)))
      .limit(1);
    if (!exam) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, exam.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select({ question: questions, link: examQuestions })
      .from(examQuestions)
      .innerJoin(questions, eq(questions.id, examQuestions.questionId))
      .where(eq(examQuestions.examId, exam.id))
      .orderBy(examQuestions.position);

    return examDetailResponseSchema.parse({
      exam: toExamDto(exam),
      questions: rows.map((row) => publicQuestion(row.question, row.link.points)),
    });
  });

  app.post("/api/v1/exams/:id/attempts", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [exam] = await database.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, params.data.id), isNull(exams.deletedAt)))
      .limit(1);
    if (!exam) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, exam.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select({ question: questions, link: examQuestions })
      .from(examQuestions)
      .innerJoin(questions, eq(questions.id, examQuestions.questionId))
      .where(eq(examQuestions.examId, exam.id))
      .orderBy(examQuestions.position);

    const maxScore = rows.reduce((total, row) => total + row.link.points, 0);
    const [attempt] = await database.db
      .insert(examAttempts)
      .values({ examId: exam.id, userId: user.id, maxScore })
      .returning();
    if (!attempt) return reply;

    return reply.code(201).send(
      startExamAttemptResponseSchema.parse({
        attempt: toAttemptDto(attempt),
        exam: toExamDto(exam),
        questions: rows.map((row) => publicQuestion(row.question, row.link.points)),
      }),
    );
  });

  app.post("/api/v1/exam-attempts/:id/submit", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = submitExamAttemptInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [attempt] = await database.db
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.id, params.data.id), eq(examAttempts.userId, user.id)))
      .limit(1);
    if (!attempt) return notFound(reply);
    if (attempt.submittedAt) return validationError(reply, { message: "该考试已提交" });

    const [exam] = await database.db
      .select({ spaceId: exams.spaceId })
      .from(exams)
      .where(eq(exams.id, attempt.examId))
      .limit(1);
    if (!exam) return notFound(reply);

    const rows = await database.db
      .select({ question: questions, link: examQuestions })
      .from(examQuestions)
      .innerJoin(questions, eq(questions.id, examQuestions.questionId))
      .where(eq(examQuestions.examId, attempt.examId));

    let score = 0;
    const gradedAnswers: Array<{
      questionId: string;
      correct: boolean;
      expectedAnswer: string;
      points: number;
    }> = [];
    const attemptRows: Array<{
      questionId: string;
      userId: string;
      answer: string;
      isCorrect: boolean;
    }> = [];

    for (const row of rows) {
      const submitted = parsed.data.answers[row.question.id] ?? "";
      const correct =
        submitted.trim().toLowerCase() === row.question.answer.trim().toLowerCase();
      if (correct) score += row.link.points;
      attemptRows.push({
        questionId: row.question.id,
        userId: user.id,
        answer: submitted,
        isCorrect: correct,
      });
      gradedAnswers.push({
        questionId: row.question.id,
        correct,
        expectedAnswer: row.question.answer,
        points: row.link.points,
      });
    }

    if (attemptRows.length > 0) {
      await database.db.insert(questionAttempts).values(attemptRows);
    }

    const [updated] = await database.db
      .update(examAttempts)
      .set({
        submittedAt: new Date(),
        score,
        answers: JSON.stringify(parsed.data.answers),
      })
      .where(eq(examAttempts.id, attempt.id))
      .returning();
    if (!updated) return reply;

    const percentage = attempt.maxScore === 0 ? 0 : Math.round((score / attempt.maxScore) * 100);
    try {
      await runAutomations(database.db, {
        trigger: "exam.submitted",
        spaceId: exam.spaceId,
        userId: user.id,
        context: { examId: attempt.examId, percentage },
      });
      await queueWebhooks(database.db, {
        spaceId: exam.spaceId,
        event: "exam.submitted",
        payload: { examId: attempt.examId, percentage },
      });
    } catch {
      // Automation must never fail the user's write.
    }
    return submitExamAttemptResponseSchema.parse({
      attempt: toAttemptDto(updated),
      percentage,
      results: gradedAnswers,
    });
  });

  app.get("/api/v1/grades", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select({ attempt: examAttempts, exam: exams })
      .from(examAttempts)
      .innerJoin(exams, eq(exams.id, examAttempts.examId))
      .where(
        and(
          eq(exams.spaceId, query.data.spaceId),
          eq(examAttempts.userId, user.id),
        ),
      )
      .orderBy(desc(examAttempts.startedAt));

    const grades = rows
      .filter((row) => row.attempt.submittedAt !== null)
      .map((row) => ({
        examId: row.exam.id,
        examTitle: row.exam.title,
        score: row.attempt.score ?? 0,
        maxScore: row.attempt.maxScore,
        percentage:
          row.attempt.maxScore === 0
            ? 0
            : Math.round(((row.attempt.score ?? 0) / row.attempt.maxScore) * 100),
        submittedAt: (row.attempt.submittedAt as Date).toISOString(),
      }));

    const averagePercentage =
      grades.length === 0
        ? 0
        : Math.round(grades.reduce((total, grade) => total + grade.percentage, 0) / grades.length);

    return gradesResponseSchema.parse({ grades, averagePercentage });
  });

  app.get("/api/v1/mastery", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select({ attempt: questionAttempts, question: questions })
      .from(questionAttempts)
      .innerJoin(questions, eq(questions.id, questionAttempts.questionId))
      .where(
        and(
          eq(questions.spaceId, query.data.spaceId),
          eq(questionAttempts.userId, user.id),
          isNull(questions.deletedAt),
        ),
      );

    const byQuestion = new Map<string, { prompt: string; attempts: number; correct: number }>();
    for (const row of rows) {
      const bucket =
        byQuestion.get(row.question.id) ??
        { prompt: row.question.prompt, attempts: 0, correct: 0 };
      bucket.attempts += 1;
      if (row.attempt.isCorrect) bucket.correct += 1;
      byQuestion.set(row.question.id, bucket);
    }

    return masteryResponseSchema.parse({
      items: [...byQuestion.entries()].map(([questionId, bucket]) => ({
        questionId,
        prompt: bucket.prompt,
        attempts: bucket.attempts,
        correct: bucket.correct,
        accuracy: Math.round((bucket.correct / bucket.attempts) * 100),
      })),
    });
  });
};
