"use client";

import type { FocusSessionDto, LearningLogDay } from "@study-os/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FOCUS_ENDPOINT, focusListEndpoint, focusStopEndpoint, learningLogEndpoint } from "@/lib/api";

export interface FocusLabels {
  title: string;
  start: string;
  stop: string;
  running: string;
  empty: string;
  recent: string;
  logTitle: string;
  logEmpty: string;
  minutes: string;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function FocusPanel({ spaceId, labels }: { spaceId: string; labels: FocusLabels }) {
  const [sessions, setSessions] = useState<FocusSessionDto[]>([]);
  const [days, setDays] = useState<LearningLogDay[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const active = useMemo(() => sessions.find((session) => session.endedAt === null), [sessions]);

  const load = useCallback(async () => {
    const [sessionsResponse, logResponse] = await Promise.all([
      fetch(focusListEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(learningLogEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (sessionsResponse.ok) {
      const body = (await sessionsResponse.json()) as { sessions: FocusSessionDto[] };
      setSessions(body.sessions);
    }
    if (logResponse.ok) {
      const body = (await logResponse.json()) as { days: LearningLogDay[] };
      setDays(body.days);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(FOCUS_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId }),
      });
      if (response.ok) {
        const { session } = (await response.json()) as { session: FocusSessionDto };
        setSessions((previous) => [session, ...previous]);
      } else {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [load, spaceId]);

  const stop = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    try {
      const response = await fetch(focusStopEndpoint(active.id), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [active, load]);

  const elapsed = active
    ? Math.max(0, Math.floor((now - Date.parse(active.startedAt)) / 1000))
    : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{labels.title}</h3>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {active ? (
          <>
            <span className="rounded-xl bg-accent-soft px-4 py-2 font-mono text-lg text-accent-ink" aria-live="polite">
              {formatElapsed(elapsed)}
            </span>
            <button
              type="button"
              onClick={() => void stop()}
              disabled={busy}
              className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
            >
              {labels.stop}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy}
            className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
          >
            {labels.start}
          </button>
        )}
      </div>

      <h4 className="mt-5 text-sm font-semibold text-muted">{labels.recent}</h4>
      {sessions.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {sessions.slice(0, 5).map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-line bg-canvas px-4 py-2 text-sm"
            >
              <span>{new Date(session.startedAt).toLocaleString()}</span>
              <span className="text-muted">
                {session.durationSeconds === null
                  ? labels.running
                  : `${Math.round(session.durationSeconds / 60)} ${labels.minutes}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-5 text-sm font-semibold text-muted">{labels.logTitle}</h4>
      {days.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{labels.logEmpty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {days.map((day) => (
            <li
              key={day.date}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-muted"
            >
              <span className="text-ink">{day.date}</span> · {day.minutes} {labels.minutes}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
