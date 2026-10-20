"use client";

import type { AttemptResult, QuestionDto, ReviewQueueItem } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  QUESTIONS_ENDPOINT,
  questionAttemptEndpoint,
  questionsEndpoint,
  reviewQueueEndpoint,
} from "@/lib/api";

export interface QuestionsLabels {
  title: string;
  empty: string;
  promptPlaceholder: string;
  answerPlaceholder: string;
  create: string;
  creating: string;
  reviewTitle: string;
  reviewEmpty: string;
  submit: string;
  correct: string;
  wrong: string;
}

export function QuestionsPanel({
  spaceId,
  labels,
}: {
  spaceId: string;
  labels: QuestionsLabels;
}) {
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, AttemptResult>>({});

  const load = useCallback(async () => {
    const [questionsResponse, queueResponse] = await Promise.all([
      fetch(questionsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(reviewQueueEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (questionsResponse.ok) {
      const body = (await questionsResponse.json()) as { questions: QuestionDto[] };
      setQuestions(body.questions);
    }
    if (queueResponse.ok) {
      const body = (await queueResponse.json()) as { items: ReviewQueueItem[] };
      setQueue(body.items);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!prompt.trim() || !answer.trim() || busy) return;
      setBusy(true);
      try {
        const response = await fetch(QUESTIONS_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ spaceId, prompt: prompt.trim(), answer: answer.trim() }),
        });
        if (response.ok) {
          const { question } = (await response.json()) as { question: QuestionDto };
          setQuestions((previous) => [question, ...previous]);
          setPrompt("");
          setAnswer("");
        }
      } finally {
        setBusy(false);
      }
    },
    [answer, busy, prompt, spaceId],
  );

  const attempt = useCallback(
    async (questionId: string) => {
      const value = answers[questionId]?.trim();
      if (!value) return;
      const response = await fetch(questionAttemptEndpoint(questionId), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ answer: value }),
      });
      if (!response.ok) return;
      const result = (await response.json()) as AttemptResult;
      setResults((previous) => ({ ...previous, [questionId]: result }));
    },
    [answers],
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{labels.title}</h3>
      <form onSubmit={create} className="mt-3 flex flex-col gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={labels.promptPlaceholder}
          aria-label={labels.promptPlaceholder}
          maxLength={2000}
          className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={labels.answerPlaceholder}
            aria-label={labels.answerPlaceholder}
            maxLength={2000}
            className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            disabled={busy || !prompt.trim() || !answer.trim()}
            className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
          >
            {busy ? labels.creating : labels.create}
          </button>
        </div>
      </form>

      {questions.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {questions.map((question) => (
            <li key={question.id} className="rounded-xl border border-line bg-canvas px-4 py-3">
              <p className="font-medium">{question.prompt}</p>
              <p className="mt-1 text-xs text-muted">
                {labels.answerPlaceholder}: {question.answer}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-6 text-sm font-semibold text-muted">{labels.reviewTitle}</h4>
      {queue.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{labels.reviewEmpty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {queue.map((item) => {
            const result = results[item.question.id];
            return (
              <li key={item.question.id} className="rounded-xl border border-line bg-canvas p-4">
                <p className="font-medium">{item.question.prompt}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={answers[item.question.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [item.question.id]: event.target.value,
                      }))
                    }
                    placeholder={labels.answerPlaceholder}
                    aria-label={`${labels.submit}: ${item.question.prompt}`}
                    className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => void attempt(item.question.id)}
                    className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas"
                  >
                    {labels.submit}
                  </button>
                </div>
                {result ? (
                  <p
                    role="status"
                    className={`mt-2 text-xs ${result.correct ? "text-ok" : "text-danger"}`}
                  >
                    {result.correct ? labels.correct : `${labels.wrong}${result.expectedAnswer}`}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
