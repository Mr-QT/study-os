"use client";

import type { SystemStatus } from "@study-os/contracts";
import { useEffect, useState } from "react";

import { SYSTEM_STATUS_ENDPOINT } from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "系统状态",
    version: "版本",
    node: "Node",
    migrations: "已应用迁移",
    backup: "最近备份",
    noBackup: "还没有备份",
    database: "数据库",
    ok: "正常",
    down: "不可用",
    checked: "检查于",
    stale: "备份超过 7 天，建议运行 pnpm backup。",
  },
  en: {
    title: "System status",
    version: "Version",
    node: "Node",
    migrations: "Applied migrations",
    backup: "Latest backup",
    noBackup: "No backup yet",
    database: "Database",
    ok: "OK",
    down: "Unavailable",
    checked: "Checked",
    stale: "Backup is older than 7 days; run pnpm backup.",
  },
} as const;

export function SystemInfoPanel({ locale }: { locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetch(SYSTEM_STATUS_ENDPOINT, {
      credentials: "include",
      headers: { accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: SystemStatus | null) => {
        if (mounted && body) setStatus(body);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  if (!status) return null;

  const backupAgeDays = status.latestBackup
    ? (Date.now() - Date.parse(status.latestBackup.createdAt)) / 86_400_000
    : null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-sm font-semibold text-muted">{text.title}</h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-canvas px-3 py-2">
          <dt className="text-xs text-muted">{text.version}</dt>
          <dd className="mt-1">{status.version}</dd>
        </div>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2">
          <dt className="text-xs text-muted">{text.database}</dt>
          <dd className="mt-1">{status.database === "ok" ? text.ok : text.down}</dd>
        </div>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2">
          <dt className="text-xs text-muted">{text.migrations}</dt>
          <dd className="mt-1">{status.appliedMigrations}</dd>
        </div>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2">
          <dt className="text-xs text-muted">{text.node}</dt>
          <dd className="mt-1">{status.nodeVersion}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted">
        {text.backup}:{" "}
        {status.latestBackup
          ? `${status.latestBackup.name} · ${(status.latestBackup.bytes / 1024).toFixed(0)} KB`
          : text.noBackup}
      </p>
      {backupAgeDays !== null && backupAgeDays > 7 ? (
        <p className="mt-1 text-xs text-danger">{text.stale}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted">
        {text.checked}: {new Date(status.checkedAt).toLocaleString()}
      </p>
    </section>
  );
}
