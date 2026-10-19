"use client";

import type { HealthResponse } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import { HEALTH_ENDPOINT } from "@/lib/api";

type ViewState = "checking" | "ok" | "degraded" | "unreachable" | "offline";

export interface SystemStatusProps {
  title: string;
  checking: string;
  connected: string;
  degraded: string;
  unreachable: string;
  offline: string;
  hint: string;
  retry: string;
  databaseLabel: string;
  dbDisabled: string;
  dbOk: string;
  dbError: string;
  versionLabel: string;
}

export function SystemStatus(props: SystemStatusProps) {
  const [state, setState] = useState<ViewState>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const check = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState("offline");
      return;
    }
    setState("checking");
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(HEALTH_ENDPOINT, {
        cache: "no-store",
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      clearTimeout(timer);
      if (!response.ok) {
        setState("unreachable");
        return;
      }
      const data = (await response.json()) as HealthResponse;
      setHealth(data);
      setState(data.status === "ok" ? "ok" : "degraded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    void check();
    const interval = setInterval(() => void check(), 30_000);
    const onOnline = () => void check();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  const label =
    state === "checking"
      ? props.checking
      : state === "ok"
        ? props.connected
        : state === "degraded"
          ? props.degraded
          : state === "offline"
            ? props.offline
            : props.unreachable;

  const tone =
    state === "ok"
      ? "border-ok/40 bg-ok/10 text-ok"
      : state === "degraded"
        ? "border-warn/40 bg-warn/10 text-warn"
        : state === "checking"
          ? "border-line bg-canvas text-muted"
          : "border-danger/40 bg-danger/10 text-danger";

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted">{props.title}</h2>
        <button
          type="button"
          onClick={() => void check()}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {props.retry}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${tone}`}
          role="status"
          aria-live="polite"
        >
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
          {label}
        </span>
        {health ? (
          <span className="text-xs text-muted">
            {props.versionLabel} {health.version} · {health.service}
          </span>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2">
          <dt className="text-muted">{props.databaseLabel}</dt>
          <dd className="font-medium">
            {health
              ? health.checks.database === "ok"
                ? props.dbOk
                : health.checks.database === "disabled"
                  ? props.dbDisabled
                  : props.dbError
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted">{props.hint}</p>
    </section>
  );
}
