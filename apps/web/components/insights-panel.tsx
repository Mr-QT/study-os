"use client";

import type {
  AnalyticsOverview,
  MemoryDto,
  TutorResponse,
} from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  MEMORIES_ENDPOINT,
  TUTOR_ENDPOINT,
  analyticsEndpoint,
  memoryEndpoint,
  memoriesEndpoint,
} from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "学习洞察与导师",
    tasks: "任务",
    done: "已完成",
    overdue: "逾期",
    focus: "近 7 天专注（分钟）",
    average: "考试平均分",
    risks: "风险提示",
    noRisks: "暂无风险。",
    weak: "薄弱题目",
    noWeak: "暂无数据。",
    memoryTitle: "AI 记忆",
    memoryPlaceholder: "例如：我更喜欢先看例题再看定义",
    memoryAdd: "添加记忆",
    disable: "停用",
    enable: "启用",
    remove: "删除",
    tutorTitle: "导师答疑",
    tutorPlaceholder: "问一个具体问题，例如：极限和导数是什么关系？",
    socratic: "苏格拉底式",
    explain: "直接解释",
    ask: "提问",
    answer: "回答",
  },
  en: {
    title: "Insights and tutor",
    tasks: "Tasks",
    done: "Done",
    overdue: "Overdue",
    focus: "Focus last 7 days (min)",
    average: "Exam average",
    risks: "Risks",
    noRisks: "No risks right now.",
    weak: "Weak questions",
    noWeak: "No data yet.",
    memoryTitle: "AI memory",
    memoryPlaceholder: "e.g. I prefer examples before definitions",
    memoryAdd: "Add memory",
    disable: "Disable",
    enable: "Enable",
    remove: "Delete",
    tutorTitle: "Tutor",
    tutorPlaceholder: "Ask a specific question",
    socratic: "Socratic",
    explain: "Explain",
    ask: "Ask",
    answer: "Answer",
  },
} as const;

export function InsightsPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [memories, setMemories] = useState<MemoryDto[]>([]);
  const [memoryText, setMemoryText] = useState("");
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("socratic");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [analyticsResponse, memoriesResponse] = await Promise.all([
      fetch(analyticsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(memoriesEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (analyticsResponse.ok) {
      setAnalytics((await analyticsResponse.json()) as AnalyticsOverview);
    }
    if (memoriesResponse.ok) {
      setMemories(((await memoriesResponse.json()) as { memories: MemoryDto[] }).memories);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addMemory = useCallback(async () => {
    if (!memoryText.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(MEMORIES_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, content: memoryText.trim(), kind: "preference" }),
      });
      if (response.ok) {
        const body = (await response.json()) as { memory: MemoryDto };
        setMemories((previous) => [body.memory, ...previous]);
        setMemoryText("");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, memoryText, spaceId]);

  const toggleMemory = useCallback(async (memory: MemoryDto) => {
    const response = await fetch(memoryEndpoint(memory.id), {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ disabled: !memory.disabled }),
    });
    if (response.ok) {
      const body = (await response.json()) as { memory: MemoryDto };
      setMemories((previous) => previous.map((item) => (item.id === body.memory.id ? body.memory : item)));
    }
  }, []);

  const removeMemory = useCallback(async (memory: MemoryDto) => {
    const response = await fetch(memoryEndpoint(memory.id), {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) setMemories((previous) => previous.filter((item) => item.id !== memory.id));
  }, []);

  const ask = useCallback(async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setAnswer("");
    try {
      const response = await fetch(TUTOR_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, question: question.trim(), mode }),
      });
      if (response.ok) {
        const body = (await response.json()) as TutorResponse;
        setAnswer(body.text);
      } else {
        setAnswer(locale === "en" ? "AI is not configured or unavailable." : "AI 未配置或暂不可用。");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, locale, mode, question, spaceId]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{text.title}</h3>

      {analytics ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
              {text.tasks}: <strong>{analytics.tasks.total}</strong>
            </div>
            <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
              {text.done}: <strong>{analytics.tasks.done}</strong>
            </div>
            <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
              {text.overdue}: <strong>{analytics.tasks.overdue}</strong>
            </div>
            <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
              {text.focus}: <strong>{analytics.focus.minutes7d}</strong>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            {text.average}: {analytics.exams.averagePercentage}%
          </p>
          <p className="mt-2 text-xs text-muted">
            {text.risks}: {analytics.risks.length === 0 ? text.noRisks : analytics.risks.join(", ")}
          </p>
          {analytics.weakQuestions.length > 0 ? (
            <ul className="mt-2 text-xs text-muted">
              {analytics.weakQuestions.map((item) => (
                <li key={item.questionId}>
                  {text.weak}: {item.prompt} ({item.accuracy}%)
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <h4 className="mt-5 text-sm font-semibold text-muted">{text.memoryTitle}</h4>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={memoryText}
          onChange={(event) => setMemoryText(event.target.value)}
          placeholder={text.memoryPlaceholder}
          aria-label={text.memoryPlaceholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void addMemory()}
          disabled={busy || !memoryText.trim()}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {text.memoryAdd}
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {memories.map((memory) => (
          <li key={memory.id} className="flex items-center justify-between gap-2 text-xs">
            <span className={memory.disabled ? "text-muted line-through" : "text-ink"}>
              {memory.content}
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={() => void toggleMemory(memory)} className="text-muted hover:text-accent-ink">
                {memory.disabled ? text.enable : text.disable}
              </button>
              <button type="button" onClick={() => void removeMemory(memory)} className="text-muted hover:text-danger">
                {text.remove}
              </button>
            </span>
          </li>
        ))}
      </ul>

      <h4 className="mt-5 text-sm font-semibold text-muted">{text.tutorTitle}</h4>
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder={text.tutorPlaceholder}
        aria-label={text.tutorPlaceholder}
        rows={2}
        className="mt-2 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          aria-label={text.tutorTitle}
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
        >
          <option value="socratic">{text.socratic}</option>
          <option value="explain">{text.explain}</option>
        </select>
        <button
          type="button"
          onClick={() => void ask()}
          disabled={busy || !question.trim()}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {text.ask}
        </button>
      </div>
      {answer ? (
        <div className="mt-3 rounded-xl border border-line bg-canvas p-3 text-sm whitespace-pre-wrap">
          <p className="text-xs text-muted">{text.answer}</p>
          {answer}
        </div>
      ) : null}
    </section>
  );
}
