"use client";

import type { AuthSessionResponse, SpaceDto, SpaceResponse } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import { AUTH_GUEST_ENDPOINT, SPACES_ENDPOINT } from "@/lib/api";
import { cacheSpaces, readCachedSpaces } from "@/lib/local-db";

type ViewState = "loading" | "ready" | "unavailable" | "error";

export interface WorkspaceLabels {
  title: string;
  subtitle: string;
  loading: string;
  empty: string;
  namePlaceholder: string;
  create: string;
  creating: string;
  createError: string;
  dbUnavailable: string;
  error: string;
  offlineCached: string;
  retry: string;
  spacesCount: string;
  guestLabel: string;
  privacyShared: string;
  privacyPersonal: string;
  privacyPrivateLocal: string;
  privacySensitive: string;
}

let guestRequest: Promise<Response> | null = null;

function requestGuest(): Promise<Response> {
  if (!guestRequest) {
    guestRequest = fetch(AUTH_GUEST_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json" },
    }).catch((error: unknown) => {
      guestRequest = null;
      throw error;
    });
  }
  return guestRequest;
}

function privacyLabel(labels: WorkspaceLabels, privacy: SpaceDto["privacyLevel"]): string {
  switch (privacy) {
    case "shared":
      return labels.privacyShared;
    case "private_local":
      return labels.privacyPrivateLocal;
    case "sensitive":
      return labels.privacySensitive;
    default:
      return labels.privacyPersonal;
  }
}

export function WorkspaceHome({ labels }: { labels: WorkspaceLabels }) {
  const [state, setState] = useState<ViewState>("loading");
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [cachedSpaces, setCachedSpaces] = useState<SpaceDto[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void readCachedSpaces()
      .then((rows) => {
        if (mounted) setCachedSpaces(rows);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await requestGuest();
      if (response.status === 503) {
        guestRequest = null;
        setState("unavailable");
        return;
      }
      if (!response.ok) {
        guestRequest = null;
        setState("error");
        return;
      }
      const data = (await response.json()) as AuthSessionResponse;
      setSession(data);
      setState("ready");
      void cacheSpaces(data.spaces).catch(() => undefined);
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createSpace = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = name.trim();
      if (!trimmed || creating) return;

      setCreating(true);
      setCreateFailed(false);
      try {
        const response = await fetch(SPACES_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!response.ok) {
          setCreateFailed(true);
          return;
        }
        const { space } = (await response.json()) as SpaceResponse;
        setSession((previous) => {
          if (!previous) return previous;
          const spaces = [...previous.spaces, space];
          void cacheSpaces(spaces).catch(() => undefined);
          return { ...previous, spaces };
        });
        setName("");
      } catch {
        setCreateFailed(true);
      } finally {
        setCreating(false);
      }
    },
    [creating, name],
  );

  const spaces = state === "ready" ? (session?.spaces ?? []) : cachedSpaces;
  const showingCache = state !== "ready" && cachedSpaces.length > 0;

  const spaceList = (items: SpaceDto[]) => (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {items.map((space) => (
        <li
          key={space.id}
          className="rounded-xl border border-line bg-canvas p-4 transition-colors hover:border-accent/50"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-ink">{space.name}</h3>
            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
              {privacyLabel(labels, space.privacyLevel)}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {new Date(space.updatedAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">{labels.title}</h2>
        {state === "ready" ? (
          <p className="text-sm text-muted">
            {spaces.length} {labels.spacesCount}
            {session ? ` · ${labels.guestLabel}` : ""}
          </p>
        ) : null}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">{labels.subtitle}</p>

      {state === "loading" && cachedSpaces.length === 0 ? (
        <p aria-live="polite" className="mt-6 text-sm text-muted">
          {labels.loading}
        </p>
      ) : null}

      {state === "unavailable" && !showingCache ? (
        <div
          role="note"
          className="mt-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn"
        >
          {labels.dbUnavailable}
        </div>
      ) : null}

      {state === "error" && !showingCache ? (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
        >
          <span>{labels.error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-current px-3 py-1.5 text-xs font-medium"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {showingCache ? (
        <div
          role="note"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-accent-soft/60 p-4 text-sm text-accent-ink"
        >
          <span>{labels.offlineCached}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-current px-3 py-1.5 text-xs font-medium"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {state === "ready" ? (
        <>
          <form onSubmit={createSpace} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={labels.namePlaceholder}
              aria-label={labels.namePlaceholder}
              maxLength={120}
              className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={creating || name.trim().length === 0}
              className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? labels.creating : labels.create}
            </button>
          </form>

          {createFailed ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {labels.createError}
            </p>
          ) : null}
        </>
      ) : null}

      {spaces.length === 0 && state === "ready" ? (
        <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-sm text-muted">
          {labels.empty}
        </p>
      ) : null}

      {spaces.length > 0 ? spaceList(spaces) : null}
    </div>
  );
}
