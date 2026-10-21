"use client";

import type { ImportBatchDto, ImportKind, ImportRowPreview } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  IMPORTS_ENDPOINT,
  importCommitEndpoint,
  importOriginalEndpoint,
  importRollbackEndpoint,
  importsEndpoint,
} from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "迁移中心（CSV）",
    kind: "导入类型",
    tasks: "任务",
    questions: "题库",
    file: "选择 CSV 文件",
    csvPlaceholder: "或直接粘贴 CSV，第一行必须是表头",
    preview: "预览",
    commit: "确认导入",
    rollback: "回滚",
    original: "下载原件",
    batches: "导入批次",
    noBatches: "还没有导入批次。",
    summary: "共 {total} 行，有效 {valid}，无效 {invalid}",
    created: "已创建 {count} 条",
    rolledBack: "已回滚 {count} 条",
    valid: "有效",
    invalid: "无效",
    row: "行",
    status: "状态",
    empty: "先预览 CSV。",
  },
  en: {
    title: "Migration center (CSV)",
    kind: "Import type",
    tasks: "Tasks",
    questions: "Questions",
    file: "Choose CSV file",
    csvPlaceholder: "Or paste CSV; first row must be a header",
    preview: "Preview",
    commit: "Commit import",
    rollback: "Roll back",
    original: "Download original",
    batches: "Import batches",
    noBatches: "No batches yet.",
    summary: "{total} rows, {valid} valid, {invalid} invalid",
    created: "Created {count}",
    rolledBack: "Rolled back {count}",
    valid: "Valid",
    invalid: "Invalid",
    row: "Row",
    status: "Status",
    empty: "Preview a CSV first.",
  },
} as const;

export function MigrationPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [kind, setKind] = useState<ImportKind>("tasks");
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ImportRowPreview[] | null>(null);
  const [batch, setBatch] = useState<ImportBatchDto | null>(null);
  const [batches, setBatches] = useState<ImportBatchDto[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(importsEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      setBatches(((await response.json()) as { batches: ImportBatchDto[] }).batches);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useCallback(async () => {
    if (!csv.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${IMPORTS_ENDPOINT}/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, kind, csv }),
      });
      if (response.ok) {
        const body = (await response.json()) as {
          batch: ImportBatchDto;
          rows: ImportRowPreview[];
        };
        setBatch(body.batch);
        setRows(body.rows);
        await load();
      } else {
        setMessage(locale === "en" ? "Preview failed." : "预览失败。");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, csv, kind, load, locale, spaceId]);

  const commit = useCallback(async () => {
    if (!batch || busy) return;
    setBusy(true);
    try {
      const response = await fetch(importCommitEndpoint(batch.id), {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const body = (await response.json()) as { created: number; batch: ImportBatchDto };
        setMessage(text.created.replace("{count}", String(body.created)));
        setBatch(body.batch);
        setRows(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [batch, busy, load, text.created]);

  const rollback = useCallback(
    async (target: ImportBatchDto) => {
      setBusy(true);
      try {
        const response = await fetch(importRollbackEndpoint(target.id), {
          method: "POST",
          credentials: "include",
        });
        if (response.ok) {
          const body = (await response.json()) as { deleted: number };
          setMessage(text.rolledBack.replace("{count}", String(body.deleted)));
          await load();
        }
      } finally {
        setBusy(false);
      }
    },
    [load, text.rolledBack],
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{text.title}</h3>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="text-xs text-muted">
          {text.kind}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as ImportKind)}
            className="ml-2 rounded-lg border border-line bg-canvas px-2 py-1 text-sm"
          >
            <option value="tasks">{text.tasks}</option>
            <option value="questions">{text.questions}</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          {text.file}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void file.text().then(setCsv);
            }}
            className="ml-2 text-xs"
          />
        </label>
      </div>

      <textarea
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
        placeholder={text.csvPlaceholder}
        aria-label={text.csvPlaceholder}
        rows={4}
        className="mt-2 w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={() => void preview()}
        disabled={busy || !csv.trim()}
        className="mt-2 rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
      >
        {text.preview}
      </button>

      {batch && rows ? (
        <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
          <p className="text-xs text-muted">
            {text.summary
              .replace("{total}", String(batch.totalRows))
              .replace("{valid}", String(batch.validRows))
              .replace("{invalid}", String(batch.invalidRows))}
          </p>
          <div className="mt-2 max-h-60 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="py-1">{text.row}</th>
                  <th className="py-1">{text.valid}</th>
                  <th className="py-1">{text.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-line/60">
                    <td className="py-1">{row.rowNumber}</td>
                    <td className="py-1">{row.valid ? "✓" : "✗"}</td>
                    <td className="py-1 text-muted">{row.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => void commit()}
            disabled={busy || batch.validRows === 0}
            className="mt-2 rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
          >
            {text.commit}
          </button>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-xs text-ok">{message}</p> : null}

      <h4 className="mt-5 text-sm font-semibold text-muted">{text.batches}</h4>
      {batches.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{text.noBatches}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {batches.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs"
            >
              <span>
                {item.filename} · {item.kind} · {item.status} · {item.validRows}/{item.totalRows}
              </span>
              <span className="flex items-center gap-2">
                <a
                  href={importOriginalEndpoint(item.id)}
                  className="text-accent-ink hover:underline"
                >
                  {text.original}
                </a>
                {item.status === "committed" ? (
                  <button
                    type="button"
                    onClick={() => void rollback(item)}
                    className="text-muted hover:text-danger"
                  >
                    {text.rollback}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
