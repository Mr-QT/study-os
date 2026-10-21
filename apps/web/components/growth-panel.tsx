"use client";

import type {
  GoalMetric,
  HabitDto,
  LearningGoalDto,
  ProfileSummary,
} from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  GOALS_ENDPOINT,
  HABITS_ENDPOINT,
  goalsEndpoint,
  habitCheckinEndpoint,
  habitsEndpoint,
  profileExportEndpoint,
  profileSummaryEndpoint,
} from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "目标、习惯与成长档案",
    goalTitle: "目标标题，例如：本周专注 300 分钟",
    goalMetric: "指标",
    goalTarget: "目标值",
    goalCreate: "添加目标",
    goalEmpty: "还没有目标。",
    focusMinutes: "专注分钟",
    tasksDone: "完成任务",
    questionsAnswered: "作答题数",
    examsCompleted: "完成考试",
    habitTitle: "习惯，例如：每天复习 10 分钟",
    habitCreate: "添加习惯",
    habitEmpty: "还没有习惯。",
    checkin: "打卡",
    streak: "连续",
    days: "天",
    today: "今日",
    summary: "成长档案",
    achievements: "成就",
    export: "导出 Markdown",
    totalFocus: "专注分钟",
    totalTasks: "完成任务",
    totalQuestions: "作答",
    totalExams: "考试",
    generated: "生成于",
  },
  en: {
    title: "Goals, habits and growth profile",
    goalTitle: "Goal title, e.g. focus 300 minutes this week",
    goalMetric: "Metric",
    goalTarget: "Target",
    goalCreate: "Add goal",
    goalEmpty: "No goals yet.",
    focusMinutes: "Focus minutes",
    tasksDone: "Tasks done",
    questionsAnswered: "Questions answered",
    examsCompleted: "Exams completed",
    habitTitle: "Habit, e.g. revise 10 minutes daily",
    habitCreate: "Add habit",
    habitEmpty: "No habits yet.",
    checkin: "Check in",
    streak: "Streak",
    days: "days",
    today: "Today",
    summary: "Growth profile",
    achievements: "Achievements",
    export: "Export Markdown",
    totalFocus: "Focus minutes",
    totalTasks: "Tasks done",
    totalQuestions: "Answered",
    totalExams: "Exams",
    generated: "Generated",
  },
} as const;

function localInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function GrowthPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [goals, setGoals] = useState<LearningGoalDto[]>([]);
  const [habits, setHabits] = useState<HabitDto[]>([]);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMetric, setGoalMetric] = useState<GoalMetric>("focus_minutes");
  const [goalTarget, setGoalTarget] = useState("300");
  const [goalStart, setGoalStart] = useState(localInputValue(new Date()));
  const [goalEnd, setGoalEnd] = useState(
    localInputValue(new Date(Date.now() + 30 * 86_400_000)),
  );
  const [habitTitle, setHabitTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [goalsResponse, habitsResponse, summaryResponse] = await Promise.all([
      fetch(goalsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(habitsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(profileSummaryEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (goalsResponse.ok) {
      setGoals(((await goalsResponse.json()) as { goals: LearningGoalDto[] }).goals);
    }
    if (habitsResponse.ok) {
      setHabits(((await habitsResponse.json()) as { habits: HabitDto[] }).habits);
    }
    if (summaryResponse.ok) {
      setSummary((await summaryResponse.json()) as ProfileSummary);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const metricLabel = (metric: GoalMetric): string =>
    metric === "focus_minutes"
      ? text.focusMinutes
      : metric === "tasks_done"
        ? text.tasksDone
        : metric === "questions_answered"
          ? text.questionsAnswered
          : text.examsCompleted;

  const createGoal = useCallback(async () => {
    if (!goalTitle.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(GOALS_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          spaceId,
          title: goalTitle.trim(),
          metric: goalMetric,
          targetValue: Number(goalTarget),
          startsAt: new Date(goalStart).toISOString(),
          endsAt: new Date(goalEnd).toISOString(),
        }),
      });
      if (response.ok) {
        setGoalTitle("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, goalEnd, goalMetric, goalStart, goalTarget, goalTitle, load, spaceId]);

  const createHabit = useCallback(async () => {
    if (!habitTitle.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(HABITS_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, title: habitTitle.trim(), cadence: "daily" }),
      });
      if (response.ok) {
        setHabitTitle("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, habitTitle, load, spaceId]);

  const checkin = useCallback(
    async (habit: HabitDto) => {
      await fetch(habitCheckinEndpoint(habit.id), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await load();
    },
    [load],
  );

  const exportProfile = useCallback(async () => {
    const response = await fetch(profileExportEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as { markdown: string };
    const blob = new Blob([body.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "study-os-growth.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [spaceId]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{text.title}</h3>
        <button
          type="button"
          onClick={() => void exportProfile()}
          className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent"
        >
          {text.export}
        </button>
      </div>

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.goalCreate}</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          value={goalTitle}
          onChange={(event) => setGoalTitle(event.target.value)}
          placeholder={text.goalTitle}
          aria-label={text.goalTitle}
          className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <select
            value={goalMetric}
            onChange={(event) => setGoalMetric(event.target.value as GoalMetric)}
            aria-label={text.goalMetric}
            className="flex-1 rounded-xl border border-line bg-canvas px-2 py-2 text-sm"
          >
            <option value="focus_minutes">{text.focusMinutes}</option>
            <option value="tasks_done">{text.tasksDone}</option>
            <option value="questions_answered">{text.questionsAnswered}</option>
            <option value="exams_completed">{text.examsCompleted}</option>
          </select>
          <input
            type="number"
            min={1}
            value={goalTarget}
            onChange={(event) => setGoalTarget(event.target.value)}
            aria-label={text.goalTarget}
            className="w-24 rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <label className="text-xs text-muted">
          {text.generated}
          <input
            type="datetime-local"
            value={goalStart}
            onChange={(event) => setGoalStart(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-muted">
          {text.generated}
          <input
            type="datetime-local"
            value={goalEnd}
            onChange={(event) => setGoalEnd(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void createGoal()}
        disabled={busy || !goalTitle.trim()}
        className="mt-2 rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
      >
        {text.goalCreate}
      </button>

      {goals.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{text.goalEmpty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {goals.map((goal) => (
            <li key={goal.id} className="rounded-xl border border-line bg-canvas p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{goal.title}</span>
                <span className="text-xs text-muted">
                  {goal.currentValue}/{goal.targetValue} · {metricLabel(goal.metric)}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-line">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${goal.progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{goal.progressPercent}%</p>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-5 text-sm font-semibold text-muted">{text.habitCreate}</h4>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={habitTitle}
          onChange={(event) => setHabitTitle(event.target.value)}
          placeholder={text.habitTitle}
          aria-label={text.habitTitle}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void createHabit()}
          disabled={busy || !habitTitle.trim()}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {text.habitCreate}
        </button>
      </div>
      {habits.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{text.habitEmpty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {habits.map((habit) => (
            <li
              key={habit.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            >
              <span>{habit.title}</span>
              <span className="flex items-center gap-3 text-xs text-muted">
                {text.streak} {habit.streak} {text.days} · {text.today} {habit.todayCount}
                <button
                  type="button"
                  onClick={() => void checkin(habit)}
                  className="rounded-lg border border-line px-2 py-1 hover:border-accent"
                >
                  {text.checkin}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {summary ? (
        <div className="mt-5 rounded-xl border border-line bg-canvas p-3">
          <h4 className="text-sm font-semibold text-muted">{text.summary}</h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>{text.totalFocus}: {summary.totals.focusMinutes}</div>
            <div>{text.totalTasks}: {summary.totals.tasksDone}</div>
            <div>{text.totalQuestions}: {summary.totals.questionsAnswered}</div>
            <div>{text.totalExams}: {summary.totals.examsCompleted}</div>
          </dl>
          <p className="mt-3 text-xs font-semibold text-muted">{text.achievements}</p>
          <ul className="mt-1 flex flex-wrap gap-2 text-xs">
            {summary.achievements.map((achievement) => (
              <li
                key={achievement.id}
                className={
                  achievement.earned
                    ? "rounded-full bg-accent-soft px-2 py-1 text-accent-ink"
                    : "rounded-full border border-line px-2 py-1 text-muted"
                }
                title={achievement.detail}
              >
                {achievement.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
