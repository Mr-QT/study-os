"use client";

import type { StatsResponse } from "@study-os/contracts";
import { useEffect, useState } from "react";

import { statsEndpoint } from "@/lib/api";

export interface StatsLabels {
  title: string;
  courses: string;
  tasks: string;
  done: string;
  notes: string;
  files: string;
  focus: string;
}

export function StatsPanel({ spaceId, labels }: { spaceId: string; labels: StatsLabels }) {
  const [counts, setCounts] = useState<StatsResponse["counts"] | null>(null);

  useEffect(() => {
    void fetch(statsEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    })
      .then((response) => (response.ok ? (response.json() as Promise<StatsResponse>) : null))
      .then((body) => setCounts(body?.counts ?? null))
      .catch(() => setCounts(null));
  }, [spaceId]);

  if (!counts) return null;

  const items = [
    { label: labels.courses, value: counts.courses },
    { label: labels.tasks, value: counts.tasks },
    { label: labels.done, value: counts.tasksDone },
    { label: labels.notes, value: counts.notes },
    { label: labels.files, value: counts.files },
    { label: labels.focus, value: counts.focusMinutes7d },
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{labels.title}</h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-canvas px-4 py-3">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="mt-1 text-xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
