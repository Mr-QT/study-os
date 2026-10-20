import type { FastifyPluginAsync } from "fastify";

import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { analyticsOverviewSchema, spaceQuerySchema } from "@study-os/contracts";
import {
  examAttempts,
  focusSessions,
  questionAttempts,
  questions,
  tasks,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

async function count(
  db: Parameters<typeof ensureSpaceAccess>[0],
  query: Promise<Array<{ total: string | null }>>,
): Promise<number> {
  void db;
  const [row] = await query;
  return Number(row?.total ?? 0);
}

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/analytics/overview", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const db = database.db;
    const spaceId = query.data.spaceId;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const totalTasks = await count(
      db,
      db
        .select({ total: sql<string | null>`count(*)` })
        .from(tasks)
        .where(and(eq(tasks.spaceId, spaceId), isNull(tasks.deletedAt))),
    );
    const doneTasks = await count(
      db,
      db
        .select({ total: sql<string | null>`count(*)` })
        .from(tasks)
        .where(
          and(eq(tasks.spaceId, spaceId), isNull(tasks.deletedAt), eq(tasks.status, "done")),
        ),
    );
    const overdueTasks = await count(
      db,
      db
        .select({ total: sql<string | null>`count(*)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.spaceId, spaceId),
            isNull(tasks.deletedAt),
            lt(tasks.dueAt, now),
            sql`${tasks.status} not in ('done','archived')`,
          ),
        ),
    );

    const [focus7d] = await db
      .select({ total: sql<string | null>`coalesce(sum(${focusSessions.durationSeconds}),0)` })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.spaceId, spaceId),
          eq(focusSessions.userId, user.id),
          gte(focusSessions.startedAt, sevenDaysAgo),
        ),
      );
    const [focusPrev] = await db
      .select({ total: sql<string | null>`coalesce(sum(${focusSessions.durationSeconds}),0)` })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.spaceId, spaceId),
          eq(focusSessions.userId, user.id),
          gte(focusSessions.startedAt, fourteenDaysAgo),
          lt(focusSessions.startedAt, sevenDaysAgo),
        ),
      );

    const examRows = await db
      .select({ score: examAttempts.score, max: examAttempts.maxScore })
      .from(examAttempts)
      .where(and(eq(examAttempts.userId, user.id), sql`${examAttempts.submittedAt} is not null`));
    const examPercentages = examRows
      .filter((row) => (row.max ?? 0) > 0)
      .map((row) => ((row.score ?? 0) / (row.max ?? 1)) * 100);

    const attemptRows = await db
      .select({ attempt: questionAttempts, question: questions })
      .from(questionAttempts)
      .innerJoin(questions, eq(questions.id, questionAttempts.questionId))
      .where(
        and(
          eq(questions.spaceId, spaceId),
          eq(questionAttempts.userId, user.id),
          isNull(questions.deletedAt),
        ),
      );
    const byQuestion = new Map<string, { prompt: string; attempts: number; correct: number }>();
    for (const row of attemptRows) {
      const bucket =
        byQuestion.get(row.question.id) ??
        { prompt: row.question.prompt, attempts: 0, correct: 0 };
      bucket.attempts += 1;
      if (row.attempt.isCorrect) bucket.correct += 1;
      byQuestion.set(row.question.id, bucket);
    }
    const weakQuestions = [...byQuestion.entries()]
      .map(([questionId, bucket]) => ({
        questionId,
        prompt: bucket.prompt,
        accuracy: Math.round((bucket.correct / bucket.attempts) * 100),
      }))
      .filter((item) => item.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const minutes7d = Math.round(Number(focus7d?.total ?? 0) / 60);
    const minutesPrev7d = Math.round(Number(focusPrev?.total ?? 0) / 60);
    const averagePercentage =
      examPercentages.length === 0
        ? 0
        : Math.round(
            examPercentages.reduce((total, value) => total + value, 0) / examPercentages.length,
          );

    const risks: string[] = [];
    if (overdueTasks > 0) risks.push("overdue_tasks");
    if (minutes7d < 60) risks.push("low_focus");
    if (examPercentages.length > 0 && averagePercentage < 60) risks.push("low_exam_score");
    if (weakQuestions.length > 0) risks.push("weak_questions");

    return analyticsOverviewSchema.parse({
      tasks: { total: totalTasks, done: doneTasks, overdue: overdueTasks },
      focus: { minutes7d, minutesPrev7d },
      exams: { attempts: examPercentages.length, averagePercentage },
      weakQuestions,
      risks,
    });
  });
};
