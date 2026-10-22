"use client";

import type { ProfileSummary } from "@study-os/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { profileExportEndpoint, profileSummaryEndpoint } from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "成长作品集",
    subtitle: "目标、习惯、成就与学习产出的汇总，可直接导出为 Markdown。",
    back: "返回空间",
    export: "导出 Markdown",
    generated: "生成于",
    totals: "学习总计",
    focus: "专注分钟",
    tasks: "完成任务",
    questions: "作答题数",
    exams: "完成考试",
    goals: "学习目标",
    noGoals: "还没有目标。",
    habits: "习惯",
    noHabits: "还没有习惯。",
    achievements: "成就",
    streak: "连续",
    days: "天",
    loading: "加载作品集…",
    error: "无法加载作品集。",
  },
  en: {
    title: "Growth portfolio",
    subtitle: "Goals, habits, achievements and learning output in one place; export as Markdown.",
    back: "Back to space",
    export: "Export Markdown",
    generated: "Generated",
    totals: "Totals",
    focus: "Focus minutes",
    tasks: "Tasks done",
    questions: "Questions answered",
    exams: "Exams completed",
    goals: "Goals",
    noGoals: "No goals yet.",
    habits: "Habits",
    noHabits: "No habits yet.",
    achievements: "Achievements",
    streak: "Streak",
    days: "days",
    loading: "Loading portfolio…",
    error: "Could not load the portfolio.",
  },
} as const;

export function PortfolioView({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(profileSummaryEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      setSummary((await response.json()) as ProfileSummary);
    } else {
      setError(true);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link href={`/${locale}/spaces/${spaceId}`} className="hover:text-accent-ink">
              {text.back}
            </Link>
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{text.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{text.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void exportProfile()}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas"
        >
          {text.export}
        </button>
      </div>

      {error ? (
        <p className="mt-8 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {text.error}
        </p>
      ) : null}

      {!summary && !error ? <p className="mt-8 text-sm text-muted">{text.loading}</p> : null}

      {summary ? (
        <div className="mt-8 flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">{text.totals}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [text.focus, summary.totals.focusMinutes],
                [text.tasks, summary.totals.tasksDone],
                [text.questions, summary.totals.questionsAnswered],
                [text.exams, summary.totals.examsCompleted],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">
              {text.generated}: {new Date(summary.generatedAt).toLocaleString()}
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">{text.goals}</h2>
            {summary.goals.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{text.noGoals}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {summary.goals.map((goal) => (
                  <li key={goal.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{goal.title}</span>
                      <span className="text-xs text-muted">
                        {goal.currentValue}/{goal.targetValue} · {goal.progressPercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-line">
                      <div
                        className="h-2 rounded-full bg-accent"
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">{text.habits}</h2>
            {summary.habits.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{text.noHabits}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {summary.habits.map((habit) => (
                  <li key={habit.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{habit.title}</span>
                    <span className="text-xs text-muted">
                      {text.streak} {habit.streak} {text.days}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">{text.achievements}</h2>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {summary.achievements.map((achievement) => (
                <li
                  key={achievement.id}
                  title={achievement.detail}
                  className={
                    achievement.earned
                      ? "rounded-full bg-accent-soft px-3 py-1.5 font-medium text-accent-ink"
                      : "rounded-full border border-line px-3 py-1.5 text-muted"
                  }
                >
                  {achievement.title}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
