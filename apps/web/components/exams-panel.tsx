"use client";

import type { ExamDto, GradeEntry, QuestionDto } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import { EXAMS_ENDPOINT, QUESTIONS_ENDPOINT, examAttemptEndpoint, examAttemptsStartEndpoint, gradesEndpoint } from "@/lib/api";

export interface ExamsLabels {
  title: string;
  empty: string;
  titlePlaceholder: string;
  create: string;
  creating: string;
  start: string;
  submit: string;
  score: string;
  average: string;
  noQuestions: string;
}

interface PublicQuestion {
  id: string;
  prompt: string;
  points: number;
}

export function ExamsPanel({ spaceId, labels }: { spaceId: string; labels: ExamsLabels }) {
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [average, setAverage] = useState(0);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<{
    attemptId: string;
    questions: PublicQuestion[];
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; max: number; percentage: number } | null>(
    null,
  );

  const load = useCallback(async () => {
    const [examsResponse, questionsResponse, gradesResponse] = await Promise.all([
      fetch(`${EXAMS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`, {
        credentials: "include",
        headers: { accept: "application/json" },
      }),
      fetch(`${QUESTIONS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`, {
        credentials: "include",
        headers: { accept: "application/json" },
      }),
      fetch(gradesEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (examsResponse.ok) setExams(((await examsResponse.json()) as { exams: ExamDto[] }).exams);
    if (questionsResponse.ok) {
      setQuestions(((await questionsResponse.json()) as { questions: QuestionDto[] }).questions);
    }
    if (gradesResponse.ok) {
      const body = (await gradesResponse.json()) as {
        grades: GradeEntry[];
        averagePercentage: number;
      };
      setGrades(body.grades);
      setAverage(body.averagePercentage);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!title.trim() || selected.length === 0 || busy) return;
      setBusy(true);
      try {
        const response = await fetch(EXAMS_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ spaceId, title: title.trim(), questionIds: selected }),
        });
        if (response.ok) {
          setTitle("");
          setSelected([]);
          await load();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, load, selected, spaceId, title],
  );

  const start = useCallback(async (exam: ExamDto) => {
    const response = await fetch(examAttemptsStartEndpoint(exam.id), {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      attempt: { id: string };
      questions: PublicQuestion[];
    };
    setActive({ attemptId: body.attempt.id, questions: body.questions });
    setAnswers({});
    setResult(null);
  }, []);

  const submit = useCallback(async () => {
    if (!active) return;
    const response = await fetch(examAttemptEndpoint(active.attemptId), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      attempt: { score: number; maxScore: number };
      percentage: number;
    };
    setResult({
      score: body.attempt.score,
      max: body.attempt.maxScore,
      percentage: body.percentage,
    });
    setActive(null);
    await load();
  }, [active, answers, load]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{labels.title}</h3>
        <p className="text-xs text-muted">
          {labels.average}: {average}%
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{labels.noQuestions}</p>
      ) : (
        <form onSubmit={create} className="mt-3 flex flex-col gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={labels.titlePlaceholder}
            aria-label={labels.titlePlaceholder}
            maxLength={200}
            className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-2">
            {questions.map((question) => (
              <label
                key={question.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(question.id)}
                  onChange={(event) =>
                    setSelected((previous) =>
                      event.target.checked
                        ? [...previous, question.id]
                        : previous.filter((id) => id !== question.id),
                    )
                  }
                />
                {question.prompt.slice(0, 40)}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy || !title.trim() || selected.length === 0}
            className="self-start rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
          >
            {busy ? labels.creating : labels.create}
          </button>
        </form>
      )}

      {result ? (
        <p role="status" className="mt-3 text-sm text-ok">
          {labels.score}: {result.score}/{result.max} ({result.percentage}%)
        </p>
      ) : null}

      {active ? (
        <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
          <ul className="flex flex-col gap-3">
            {active.questions.map((question) => (
              <li key={question.id}>
                <p className="text-sm font-medium">{question.prompt}</p>
                <input
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))
                  }
                  aria-label={`答案 ${question.prompt}`}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void submit()}
            className="mt-3 rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas"
          >
            {labels.submit}
          </button>
        </div>
      ) : null}

      {exams.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-3"
            >
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-xs text-muted">{new Date(exam.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => void start(exam)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-accent"
              >
                {labels.start}
              </button>
            </li>
          ))}
        </ul>
      )}

      {grades.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1 text-xs text-muted">
          {grades.map((grade) => (
            <li key={`${grade.examId}-${grade.submittedAt}`}>
              {grade.examTitle}: {grade.score}/{grade.maxScore} ({grade.percentage}%)
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
