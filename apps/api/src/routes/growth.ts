import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import {
  achievementSchema,
  createGoalInputSchema,
  createHabitInputSchema,
  goalListResponseSchema,
  goalResponseSchema,
  habitCheckinInputSchema,
  habitListResponseSchema,
  habitResponseSchema,
  idParamSchema,
  learningGoalSchema,
  profileExportResponseSchema,
  profileSummarySchema,
  spaceQuerySchema,
  updateGoalInputSchema,
  updateHabitInputSchema,
  type GoalMetric,
  type HabitDto,
  type LearningGoalDto,
} from "@study-os/contracts";
import {
  examAttempts,
  exams,
  focusSessions,
  habitCheckins,
  habits,
  learningGoals,
  questionAttempts,
  questions,
  spaces,
  tasks,
  type Db,
  type HabitRow,
  type LearningGoalRow,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function metricValue(
  db: Db,
  userId: string,
  goal: LearningGoalRow,
): Promise<number> {
  const metric = goal.metric as GoalMetric;

  if (metric === "focus_minutes") {
    const [row] = await db
      .select({ total: sql<string | null>`coalesce(sum(${focusSessions.durationSeconds}),0)` })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.spaceId, goal.spaceId),
          eq(focusSessions.userId, userId),
          gte(focusSessions.startedAt, goal.startsAt),
          lte(focusSessions.startedAt, goal.endsAt),
        ),
      );
    return Math.round(Number(row?.total ?? 0) / 60);
  }

  if (metric === "tasks_done") {
    const [row] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.spaceId, goal.spaceId),
          eq(tasks.status, "done"),
          gte(tasks.updatedAt, goal.startsAt),
          lte(tasks.updatedAt, goal.endsAt),
        ),
      );
    return Number(row?.total ?? 0);
  }

  if (metric === "questions_answered") {
    const [row] = await db
      .select({ total: sql<string | null>`count(*)` })
      .from(questionAttempts)
      .innerJoin(questions, eq(questions.id, questionAttempts.questionId))
      .where(
        and(
          eq(questions.spaceId, goal.spaceId),
          eq(questionAttempts.userId, userId),
          gte(questionAttempts.createdAt, goal.startsAt),
          lte(questionAttempts.createdAt, goal.endsAt),
        ),
      );
    return Number(row?.total ?? 0);
  }

  const [row] = await db
    .select({ total: sql<string | null>`count(*)` })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(
      and(
        eq(exams.spaceId, goal.spaceId),
        eq(examAttempts.userId, userId),
        gte(examAttempts.submittedAt, goal.startsAt),
        lte(examAttempts.submittedAt, goal.endsAt),
      ),
    );
  return Number(row?.total ?? 0);
}

async function toGoalDto(db: Db, userId: string, goal: LearningGoalRow): Promise<LearningGoalDto> {
  const currentValue = await metricValue(db, userId, goal);
  return learningGoalSchema.parse({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    metric: goal.metric,
    targetValue: goal.targetValue,
    currentValue,
    progressPercent: Math.min(100, Math.round((currentValue / goal.targetValue) * 100)),
    startsAt: goal.startsAt.toISOString(),
    endsAt: goal.endsAt.toISOString(),
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  });
}

async function toHabitDto(db: Db, habit: HabitRow): Promise<HabitDto> {
  const checkins = await db
    .select()
    .from(habitCheckins)
    .where(eq(habitCheckins.habitId, habit.id))
    .orderBy(desc(habitCheckins.checkinDate));

  const byDate = new Map(checkins.map((row) => [row.checkinDate, row.count]));
  const today = todayKey();
  const todayCount = byDate.get(today) ?? 0;

  const cursor = new Date(`${today}T00:00:00.000Z`);
  if (!byDate.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  for (let i = 0; i < 3650; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!byDate.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    id: habit.id,
    title: habit.title,
    cadence: habit.cadence,
    targetPerPeriod: habit.targetPerPeriod,
    active: habit.active,
    todayCount,
    streak,
    createdAt: habit.createdAt.toISOString(),
  };
}

async function totals(db: Db, userId: string, spaceId: string) {
  const [focus] = await db
    .select({ total: sql<string | null>`coalesce(sum(${focusSessions.durationSeconds}),0)` })
    .from(focusSessions)
    .where(and(eq(focusSessions.spaceId, spaceId), eq(focusSessions.userId, userId)));
  const [done] = await db
    .select({ total: sql<string | null>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.spaceId, spaceId), eq(tasks.status, "done")));
  const [answered] = await db
    .select({ total: sql<string | null>`count(*)` })
    .from(questionAttempts)
    .innerJoin(questions, eq(questions.id, questionAttempts.questionId))
    .where(and(eq(questions.spaceId, spaceId), eq(questionAttempts.userId, userId)));
  const [completedExams] = await db
    .select({ total: sql<string | null>`count(*)` })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(
      and(
        eq(exams.spaceId, spaceId),
        eq(examAttempts.userId, userId),
        sql`${examAttempts.submittedAt} is not null`,
      ),
    );

  return {
    focusMinutes: Math.round(Number(focus?.total ?? 0) / 60),
    tasksDone: Number(done?.total ?? 0),
    questionsAnswered: Number(answered?.total ?? 0),
    examsCompleted: Number(completedExams?.total ?? 0),
  };
}

function achievementsFor(
  totalsValue: Awaited<ReturnType<typeof totals>>,
  habitDtos: HabitDto[],
) {
  const bestStreak = habitDtos.reduce((best, habit) => Math.max(best, habit.streak), 0);
  return [
    { id: "first_focus", title: "第一次专注", earned: totalsValue.focusMinutes > 0, detail: "完成至少 1 分钟专注" },
    { id: "focus_10h", title: "专注 10 小时", earned: totalsValue.focusMinutes >= 600, detail: "累计专注 600 分钟" },
    { id: "tasks_50", title: "完成任务 50 个", earned: totalsValue.tasksDone >= 50, detail: "累计完成 50 个任务" },
    { id: "questions_10", title: "答过 10 道题", earned: totalsValue.questionsAnswered >= 10, detail: "累计作答 10 道题" },
    { id: "exam_1", title: "完成一次考试", earned: totalsValue.examsCompleted >= 1, detail: "提交至少 1 次考试" },
    { id: "streak_7", title: "连续 7 天", earned: bestStreak >= 7, detail: "任一习惯连续 7 天打卡" },
  ].map((item) => achievementSchema.parse(item));
}

async function spaceName(db: Db, spaceId: string): Promise<string> {
  const [row] = await db
    .select({ name: spaces.name })
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);
  return row?.name ?? "未命名空间";
}

export const growthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/goals", async (request, reply) => {
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
      .from(learningGoals)
      .where(
        and(eq(learningGoals.spaceId, query.data.spaceId), eq(learningGoals.userId, user.id)),
      )
      .orderBy(desc(learningGoals.updatedAt));
    return goalListResponseSchema.parse({
      goals: await Promise.all(rows.map((row) => toGoalDto(database.db, user.id, row))),
    });
  });

  app.post("/api/v1/goals", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createGoalInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const [goal] = await database.db
      .insert(learningGoals)
      .values({
        spaceId: parsed.data.spaceId,
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        metric: parsed.data.metric,
        targetValue: parsed.data.targetValue,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
      })
      .returning();
    if (!goal) return reply;
    return reply
      .code(201)
      .send(goalResponseSchema.parse({ goal: await toGoalDto(database.db, user.id, goal) }));
  });

  app.patch("/api/v1/goals/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateGoalInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(learningGoals)
      .where(and(eq(learningGoals.id, params.data.id), eq(learningGoals.userId, user.id)))
      .limit(1);
    if (!existing) return notFound(reply);

    const [updated] = await database.db
      .update(learningGoals)
      .set({
        ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
        ...(parsed.data.description === undefined
          ? {}
          : { description: parsed.data.description }),
        ...(parsed.data.targetValue === undefined
          ? {}
          : { targetValue: parsed.data.targetValue }),
        ...(parsed.data.startsAt === undefined ? {} : { startsAt: new Date(parsed.data.startsAt) }),
        ...(parsed.data.endsAt === undefined ? {} : { endsAt: new Date(parsed.data.endsAt) }),
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        updatedAt: new Date(),
      })
      .where(eq(learningGoals.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    return goalResponseSchema.parse({ goal: await toGoalDto(database.db, user.id, updated) });
  });

  app.delete("/api/v1/goals/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const deleted = await database.db
      .delete(learningGoals)
      .where(and(eq(learningGoals.id, params.data.id), eq(learningGoals.userId, user.id)))
      .returning();
    if (deleted.length === 0) return notFound(reply);
    return reply.code(204).send();
  });

  app.get("/api/v1/habits", async (request, reply) => {
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
      .from(habits)
      .where(and(eq(habits.spaceId, query.data.spaceId), eq(habits.userId, user.id)))
      .orderBy(desc(habits.updatedAt));
    return habitListResponseSchema.parse({
      habits: await Promise.all(rows.map((row) => toHabitDto(database.db, row))),
    });
  });

  app.post("/api/v1/habits", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createHabitInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const [habit] = await database.db
      .insert(habits)
      .values({
        spaceId: parsed.data.spaceId,
        userId: user.id,
        title: parsed.data.title,
        cadence: parsed.data.cadence ?? "daily",
        targetPerPeriod: parsed.data.targetPerPeriod ?? 1,
      })
      .returning();
    if (!habit) return reply;
    return reply
      .code(201)
      .send(habitResponseSchema.parse({ habit: await toHabitDto(database.db, habit) }));
  });

  app.patch("/api/v1/habits/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateHabitInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(habits)
      .where(and(eq(habits.id, params.data.id), eq(habits.userId, user.id)))
      .limit(1);
    if (!existing) return notFound(reply);

    const [updated] = await database.db
      .update(habits)
      .set({
        ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
        ...(parsed.data.cadence === undefined ? {} : { cadence: parsed.data.cadence }),
        ...(parsed.data.targetPerPeriod === undefined
          ? {}
          : { targetPerPeriod: parsed.data.targetPerPeriod }),
        ...(parsed.data.active === undefined ? {} : { active: parsed.data.active }),
        updatedAt: new Date(),
      })
      .where(eq(habits.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    return habitResponseSchema.parse({ habit: await toHabitDto(database.db, updated) });
  });

  app.post("/api/v1/habits/:id/checkins", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = habitCheckinInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [habit] = await database.db
      .select()
      .from(habits)
      .where(and(eq(habits.id, params.data.id), eq(habits.userId, user.id)))
      .limit(1);
    if (!habit) return notFound(reply);

    const checkinDate = parsed.data.date ?? todayKey();
    await database.db
      .insert(habitCheckins)
      .values({ habitId: habit.id, userId: user.id, checkinDate, count: 1 })
      .onConflictDoUpdate({
        target: [habitCheckins.habitId, habitCheckins.checkinDate],
        set: { count: sql`${habitCheckins.count} + 1` },
      });

    return habitResponseSchema.parse({ habit: await toHabitDto(database.db, habit) });
  });

  app.get("/api/v1/profile/summary", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const goalRows = await database.db
      .select()
      .from(learningGoals)
      .where(
        and(eq(learningGoals.spaceId, query.data.spaceId), eq(learningGoals.userId, user.id)),
      );
    const habitRows = await database.db
      .select()
      .from(habits)
      .where(and(eq(habits.spaceId, query.data.spaceId), eq(habits.userId, user.id)));
    const goals = await Promise.all(goalRows.map((row) => toGoalDto(database.db, user.id, row)));
    const habitDtos = await Promise.all(habitRows.map((row) => toHabitDto(database.db, row)));
    const totalsValue = await totals(database.db, user.id, query.data.spaceId);

    return profileSummarySchema.parse({
      totals: totalsValue,
      goals,
      habits: habitDtos,
      achievements: achievementsFor(totalsValue, habitDtos),
      generatedAt: new Date().toISOString(),
    });
  });

  app.get("/api/v1/profile/export", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const name = await spaceName(database.db, query.data.spaceId);
    const totalsValue = await totals(database.db, user.id, query.data.spaceId);
    const goalRows = await database.db
      .select()
      .from(learningGoals)
      .where(
        and(eq(learningGoals.spaceId, query.data.spaceId), eq(learningGoals.userId, user.id)),
      );
    const goals = await Promise.all(goalRows.map((row) => toGoalDto(database.db, user.id, row)));
    const habitRows = await database.db
      .select()
      .from(habits)
      .where(and(eq(habits.spaceId, query.data.spaceId), eq(habits.userId, user.id)));
    const habitDtos = await Promise.all(habitRows.map((row) => toHabitDto(database.db, row)));
    const generatedAt = new Date().toISOString();

    const markdown = [
      `# ${name} · 成长档案`,
      "",
      `生成时间：${generatedAt}`,
      "",
      "## 总计",
      `- 专注：${totalsValue.focusMinutes} 分钟`,
      `- 完成任务：${totalsValue.tasksDone} 个`,
      `- 作答：${totalsValue.questionsAnswered} 次`,
      `- 完成考试：${totalsValue.examsCompleted} 次`,
      "",
      "## 学习目标",
      ...(goals.length
        ? goals.map(
            (goal) =>
              `- ${goal.title}：${goal.currentValue}/${goal.targetValue}（${goal.progressPercent}%）`,
          )
        : ["- 暂无"]),
      "",
      "## 习惯",
      ...(habitDtos.length
        ? habitDtos.map(
            (habit) => `- ${habit.title}：连续 ${habit.streak} 天，今日 ${habit.todayCount} 次`,
          )
        : ["- 暂无"]),
      "",
      "## 来源说明",
      `本档案由 Study OS 根据 focus_sessions、tasks、question_attempts、exam_attempts 聚合生成；`,
      `生成时间 ${generatedAt}，空间 ${name}（${query.data.spaceId}）。`,
      "该文件不包含原始笔记或题目内容。",
    ].join("\n");

    return profileExportResponseSchema.parse({ markdown, generatedAt });
  });
};
