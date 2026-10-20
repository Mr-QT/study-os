"use client";

import type { SemanticSearchResult } from "@study-os/contracts";
import { useCallback, useState } from "react";

import { RAG_REINDEX_ENDPOINT, semanticSearchEndpoint } from "@/lib/api";

export interface SearchLabels {
  title: string;
  placeholder: string;
  search: string;
  reindex: string;
  empty: string;
  reindexed: string;
}

export function SemanticSearchPanel({
  spaceId,
  labels,
}: {
  spaceId: string;
  labels: SearchLabels;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticSearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const search = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const q = query.trim();
      if (!q || busy) return;
      setBusy(true);
      setMessage("");
      try {
        const response = await fetch(semanticSearchEndpoint(spaceId, q), {
          credentials: "include",
          headers: { accept: "application/json" },
        });
        if (response.ok) {
          const body = (await response.json()) as { results: SemanticSearchResult[] };
          setResults(body.results);
        } else {
          setResults([]);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, query, spaceId],
  );

  const reindex = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(RAG_REINDEX_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId }),
      });
      if (response.ok) setMessage(labels.reindexed);
    } finally {
      setBusy(false);
    }
  }, [labels.reindexed, spaceId]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{labels.title}</h3>
        <button
          type="button"
          onClick={() => void reindex()}
          disabled={busy}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-accent"
        >
          {labels.reindex}
        </button>
      </div>
      <form onSubmit={search} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {labels.search}
        </button>
      </form>
      {message ? <p className="mt-2 text-xs text-ok">{message}</p> : null}

      {results === null ? null : results.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((result) => (
            <li
              key={`${result.sourceType}-${result.sourceId}`}
              className="rounded-xl border border-line bg-canvas px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{result.title}</p>
                <span className="text-xs text-muted">
                  {result.sourceType} · {result.score}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{result.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
