"use client";

import type { FileAssetDto } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import { PdfViewer } from "@/components/pdf-viewer";
import { FILES_ENDPOINT, fileContentEndpoint, fileEndpoint, filesListEndpoint } from "@/lib/api";

export interface FilesLabels {
  title: string;
  empty: string;
  upload: string;
  uploading: string;
  selectFile: string;
  remove: string;
  hint: string;
  pdfView: string;
  pdfClose: string;
  pdfPrev: string;
  pdfNext: string;
  pdfPage: string;
  pdfLoading: string;
  pdfLoadError: string;
  pdfAnnotations: string;
  pdfNoAnnotations: string;
  pdfNotePlaceholder: string;
  pdfSave: string;
  pdfClickHint: string;
}

export function FilesPanel({ spaceId, labels }: { spaceId: string; labels: FilesLabels }) {
  const [files, setFiles] = useState<FileAssetDto[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<FileAssetDto | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(filesListEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      const body = (await response.json()) as { files: FileAssetDto[] };
      setFiles(body.files);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", selected);
      const response = await fetch(
        `${FILES_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`,
        { method: "POST", credentials: "include", body: form },
      );
      if (!response.ok) {
        setError(labels.hint);
        return;
      }
      const { file } = (await response.json()) as { file: FileAssetDto };
      setFiles((previous) => [file, ...previous]);
      setSelected(null);
    } catch {
      setError(labels.hint);
    } finally {
      setBusy(false);
    }
  }, [labels.hint, selected, spaceId]);

  const remove = useCallback(async (file: FileAssetDto) => {
    const response = await fetch(fileEndpoint(file.id), {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      setFiles((previous) => previous.filter((item) => item.id !== file.id));
    }
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{labels.title}</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          onChange={(event) => setSelected(event.target.files?.[0] ?? null)}
          aria-label={labels.selectFile}
          className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:text-accent-ink"
        />
        <button
          type="button"
          onClick={() => void upload()}
          disabled={busy || !selected}
          className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {busy ? labels.uploading : labels.upload}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{labels.hint}</p>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}

      {files.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-2 text-sm"
            >
              <a
                href={fileContentEndpoint(file.id)}
                className="truncate font-medium hover:text-accent-ink"
              >
                {file.name}
              </a>
              <span className="shrink-0 text-xs text-muted">
                {(file.sizeBytes / 1024).toFixed(0)} KB
              </span>
              {file.mime === "application/pdf" ? (
                <button
                  type="button"
                  onClick={() => setViewer(file)}
                  className="shrink-0 text-xs text-accent-ink hover:underline"
                >
                  {labels.pdfView}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void remove(file)}
                className="text-xs text-muted hover:text-danger"
              >
                {labels.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewer ? (
        <PdfViewer
          spaceId={spaceId}
          fileId={viewer.id}
          fileName={viewer.name}
          labels={{
            title: labels.pdfView,
            close: labels.pdfClose,
            prev: labels.pdfPrev,
            next: labels.pdfNext,
            page: labels.pdfPage,
            loading: labels.pdfLoading,
            loadError: labels.pdfLoadError,
            annotations: labels.pdfAnnotations,
            noAnnotations: labels.pdfNoAnnotations,
            notePlaceholder: labels.pdfNotePlaceholder,
            save: labels.pdfSave,
            clickHint: labels.pdfClickHint,
          }}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </section>
  );
}
