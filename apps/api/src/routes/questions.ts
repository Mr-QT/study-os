import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { and, desc, eq, isNull, lte } from "drizzle-orm";

import {
  attemptInputSchema,
  attemptResultSchema,
  createQuestionInputSchema,
  idParamSchema,
  questionListResponseSchema,
  questionResponseSchema,
  reviewQueueResponseSchema,
  spaceQuerySchema,
  wrongAnswersResponseSchema,
  type QuestionDto,
} from "@study-os/contracts";
import {
  questionAttempts,
  questions,
  reviewItems,
  type Db,
  type QuestionRow,
  type UserRow,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

function toQuestionDto(row: QuestionRow): QuestionDto {
  let options: string[] | null = null;
  if (row.options) {
    try {
      const parsed: unknown = JSON.parse(row.options);
      if (Array.isArray(parsed)) options = parsed.filter((item): item is string => typeof item === "string");
    } catch {
      options = null;
    }
  }
  return {
    id: row.id,
    spaceId: row.spaceId,
    courseId: row.courseId,
    prompt: row.prompt,
    answer: row.answer,
    explanation: row.explanation,
    kind: row.kind,
    options,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function authorize(
  db: Db,
  user: UserRow,
  spaceId: string,
  write: boolean,
  reply: FastifyReply,
): Promise<boolean> {
  const access = await ensureSpaceAccess(db, user.id, spaceId, write);
  if (access !== "ok") {
    notFound(reply);
    return false;
  }
  return true;
}

interface ScheduleState {
  intervalDays: number;
  ease: number;
  repetitions: number;
}

function nextSchedule(correct: boolean, current: ScheduleState | undefined): ScheduleState {
  if (!correct) {
    return {
      intervalDays: 1,
      ease: Math.max(130, (current?.ease ?? 250) - 20),
      repetitions: 0,
    };
  }
  const repetitions = (current?.repetitions ?? 0) + 1;
  const ease = Math.min(300, (current?.ease ?? 250) + 10);
  if (repetitions === 1) return { intervalDays: 1, ease, repetitions };
  if (repetitions === 2) return { intervalDays: 3, ease, repetitions };
  const intervalDays = Math.max(1, Math.round((current?.intervalDays ?? 3) * (ease / 100)));
  return { intervalDays, ease, repetitions };
}

export const questionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/questions", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if (!(await authorize(database.db, user, query.data.spaceId, false, reply))) return reply;

    const rows = await database.db
      .select()
      .from(questions)
      .where(and(eq(questions.spaceId, query.data.spaceId), isNull(questions.deletedAt)));
    return questionListResponseSchema.parse({ questions: rows.map(toQuestionDto) });
  });

  app.post("/api/v1/questions", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createQuestionInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if (!(await authorize(database.db, user, parsed.data.spaceId, true, reply))) return reply;

    const [question] = await database.db
      .insert(questions)
      .values({
        spaceId: parsed.data.spaceId,
        courseId: parsed.data.courseId ?? null,
        prompt: parsed.data.prompt,
        answer: parsed.data.answer,
        explanation: parsed.data.explanation ?? null,
        kind: parsed.data.kind ?? "short_answer",
        options: parsed.data.options ? JSON.stringify(parsed.data.options) : null,
      })
      .returning();
    if (!question) return reply;
    return reply.code(201).send(questionResponseSchema.parse({ question: toQuestionDto(question) }));
  });

  app.delete("/api/v1/questions/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [question] = await database.db
      .select()
      .from(questions)
      .where(and(eq(questions.id, params.data.id), isNull(questions.deletedAt)))
      .limit(1);
    if (!question) return notFound(reply);
    if (!(await authorize(database.db, user, question.spaceId, true, reply))) return reply;

    await database.db
      .update(questions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(questions.id, question.id));
    return reply.code(204).send();
  });

  app.post("/api/v1/questions/:id/attempts", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = attemptInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [question] = await database.db
      .select()
      .from(questions)
      .where(and(eq(questions.id, params.data.id), isNull(questions.deletedAt)))
      .limit(1);
    if (!question) return notFound(reply);
    if (!(await authorize(database.db, user, question.spaceId, true, reply))) return reply;

    const correct =
      parsed.data.answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    const [attempt] = await database.db
      .insert(questionAttempts)
      .values({
        questionId: question.id,
        userId: user.id,
        answer: parsed.data.answer,
        isCorrect: correct,
      })
      .returning();
    if (!attempt) return reply;

    const [existing] = await database.db
      .select()
      .from(reviewItems)
      .where(and(eq(reviewItems.questionId, question.id), eq(reviewItems.userId, user.id)))
      .limit(1);

    const schedule = nextSchedule(
      correct,
      existing
        ? {
            intervalDays: existing.intervalDays,
            ease: existing.ease,
            repetitions: existing.repetitions,
          }
        : undefined,
    );
    const dueAt = new Date(Date.now() + schedule.intervalDays * 24 * 60 * 60 * 1000);

    await database.db
      .insert(reviewItems)
      .values({
        questionId: question.id,
        userId: user.id,
        dueAt,
        intervalDays: schedule.intervalDays,
        ease: schedule.ease,
        repetitions: schedule.repetitions,
        lastReviewedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [reviewItems.questionId, reviewItems.userId],
        set: {
          dueAt,
          intervalDays: schedule.intervalDays,
          ease: schedule.ease,
          repetitions: schedule.repetitions,
          lastReviewedAt: new Date(),
        },
      });

    return attemptResultSchema.parse({
      attemptId: attempt.id,
      correct,
      expectedAnswer: question.answer,
      explanation: question.explanation,
      intervalDays: schedule.intervalDays,
      nextDueAt: dueAt.toISOString(),
    });
  });

  app.get("/api/v1/review/queue", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if (!(await authorize(database.db, user, query.data.spaceId, false, reply))) return reply;

    const rows = await database.db
      .select({ item: reviewItems, question: questions })
      .from(reviewItems)
      .innerJoin(questions, eq(questions.id, reviewItems.questionId))
      .where(
        and(
          eq(questions.spaceId, query.data.spaceId),
          eq(reviewItems.userId, user.id),
          isNull(questions.deletedAt),
          lte(reviewItems.dueAt, new Date()),
        ),
      )
      .orderBy(reviewItems.dueAt);

    return reviewQueueResponseSchema.parse({
      items: rows.map(({ item, question }) => ({
        question: toQuestionDto(question),
        dueAt: item.dueAt.toISOString(),
        intervalDays: item.intervalDays,
        repetitions: item.repetitions,
      })),
    });
  });

  app.get("/api/v1/questions/wrong", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if (!(await authorize(database.db, user, query.data.spaceId, false, reply))) return reply;

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
      )
      .orderBy(desc(questionAttempts.createdAt));

    const seen = new Set<string>();
    const wrong: QuestionDto[] = [];
    for (const row of rows) {
      if (seen.has(row.question.id)) continue;
      seen.add(row.question.id);
      if (!row.attempt.isCorrect) wrong.push(toQuestionDto(row.question));
    }
    return wrongAnswersResponseSchema.parse({ questions: wrong });
  });
};
