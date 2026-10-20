"use client";

import type { AiRequestResponse, AiStatusResponse } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import { AI_REQUESTS_ENDPOINT, AI_STATUS_ENDPOINT } from "@/lib/api";

export interface AiLabels {
  title: string;
  disabled: string;
  placeholder: string;
  generate: string;
  generating: string;
  budget: string;
  remaining: string;
  error: string;
  privacyNote: string;
}

export function AiPanel({ spaceId, labels }: { spaceId: string; labels: AiLabels }) {
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch(AI_STATUS_ENDPOINT, { credentials: "include", headers: { accept: "application/json" } })
      .then((response) => (response.ok ? (response.json() as Promise<AiStatusResponse>) : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const generate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = input.trim();
      if (!text || busy) return;
      setBusy(true);
      setError(false);
      try {
        const response = await fetch(AI_REQUESTS_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ spaceId, purpose: "study_plan", input: text }),
        });
        if (!response.ok) {
          setError(true);
          return;
        }
        const body = (await response.json()) as AiRequestResponse;
        setResult(body.text);
        const refreshed = await fetch(AI_STATUS_ENDPOINT, {
          credentials: "include",
          headers: { accept: "application/json" },
        });
        if (refreshed.ok) setStatus((await refreshed.json()) as AiStatusResponse);
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, input, spaceId],
  );

  if (!status) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{labels.title}</h3>
      {status.enabled ? (
        <>
          <p className="mt-1 text-xs text-muted">
            {status.provider} · {status.model} · {labels.budget} ${status.budgetUsd.toFixed(2)} ·{" "}
            {labels.remaining} ${status.remainingUsd.toFixed(2)}
          </p>
          <form onSubmit={generate} className="mt-3 flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={labels.placeholder}
              aria-label={labels.placeholder}
              rows={3}
              className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              className="self-start rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
            >
              {busy ? labels.generating : labels.generate}
            </button>
          </form>
          {error ? <p role="alert" className="mt-2 text-xs text-danger">{labels.error}</p> : null}
          {result ? (
            <div className="mt-4 rounded-xl border border-line bg-canvas p-4 text-sm whitespace-pre-wrap">
              {result}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted">{labels.privacyNote}</p>
        </>
      ) : (
        <p role="note" className="mt-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          {labels.disabled}
        </p>
      )}
    </section>
  );
}
