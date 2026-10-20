"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import { fileContentEndpoint, pdfAnnotationEndpoint, pdfAnnotationsEndpoint } from "@/lib/api";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

export interface PdfAnnotation {
  id: string;
  page: number;
  rect: string | null;
  note: string | null;
  color: string;
  createdAt: string;
}

export interface PdfViewerLabels {
  title: string;
  close: string;
  prev: string;
  next: string;
  page: string;
  loading: string;
  loadError: string;
  annotations: string;
  noAnnotations: string;
  notePlaceholder: string;
  save: string;
  clickHint: string;
}

interface PendingPin {
  x: number;
  y: number;
}

export function PdfViewer({
  spaceId,
  fileId,
  fileName,
  labels,
  onClose,
}: {
  spaceId: string;
  fileId: string;
  fileName: string;
  labels: PdfViewerLabels;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [pdfResponse, annotationResponse] = await Promise.all([
          fetch(fileContentEndpoint(fileId), { credentials: "include" }),
          fetch(pdfAnnotationsEndpoint(spaceId, fileId), {
            credentials: "include",
            headers: { accept: "application/json" },
          }),
        ]);
        if (!pdfResponse.ok) throw new Error("pdf");
        const data = new Uint8Array(await pdfResponse.arrayBuffer());
        const loaded = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        setDoc(loaded);
        setPageCount(loaded.numPages);
        if (annotationResponse.ok) {
          const body = (await annotationResponse.json()) as { annotations: PdfAnnotation[] };
          setAnnotations(body.annotations);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId, spaceId]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    void (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1.3 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber]);

  const addAnnotation = useCallback(
    async (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - target.left) / target.width;
      const y = (event.clientY - target.top) / target.height;
      setPending({ x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) });
      setNote("");
    },
    [],
  );

  const save = useCallback(async () => {
    if (!pending || saving) return;
    setSaving(true);
    try {
      const response = await fetch(pdfAnnotationEndpoint(), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          spaceId,
          fileId,
          page: pageNumber,
          rect: JSON.stringify({ x: pending.x, y: pending.y }),
          note: note.trim() || null,
        }),
      });
      if (response.ok) {
        const body = (await response.json()) as { annotation: PdfAnnotation };
        setAnnotations((previous) => [...previous, body.annotation]);
        setPending(null);
        setNote("");
      }
    } finally {
      setSaving(false);
    }
  }, [fileId, note, pageNumber, pending, saving, spaceId]);

  const pageAnnotations = annotations.filter((item) => item.page === pageNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <p className="font-medium">{fileName}</p>
            <p className="text-xs text-muted">{labels.title}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
              disabled={pageNumber <= 1}
              className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {labels.prev}
            </button>
            <span className="text-xs text-muted">
              {pageNumber} / {pageCount} {labels.page}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((value) => Math.min(pageCount, value + 1))}
              disabled={pageNumber >= pageCount}
              className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {labels.next}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas"
            >
              {labels.close}
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col items-center">
            {loading ? <p className="text-sm text-muted">{labels.loading}</p> : null}
            {error ? <p className="text-sm text-danger">{labels.loadError}</p> : null}
            {!loading && !error ? (
              <div className="relative max-w-full" onClick={(event) => void addAnnotation(event)}>
                <canvas ref={canvasRef} className="max-w-full rounded-lg border border-line" />
                {pageAnnotations.map((annotation) => {
                  let position = { x: 0.1, y: 0.1 };
                  try {
                    position = JSON.parse(annotation.rect ?? "{}") as { x: number; y: number };
                  } catch {
                    position = { x: 0.1, y: 0.1 };
                  }
                  return (
                    <span
                      key={annotation.id}
                      title={annotation.note ?? ""}
                      aria-label={annotation.note ?? ""}
                      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-accent"
                      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
                    />
                  );
                })}
                {pending ? (
                  <span
                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warn"
                    style={{ left: `${pending.x * 100}%`, top: `${pending.y * 100}%` }}
                  />
                ) : null}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted">{labels.clickHint}</p>
          </div>

          <aside className="flex flex-col gap-3">
            {pending ? (
              <div className="rounded-xl border border-line bg-canvas p-3">
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={labels.notePlaceholder}
                  aria-label={labels.notePlaceholder}
                  rows={3}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
                  >
                    {labels.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs"
                  >
                    {labels.close}
                  </button>
                </div>
              </div>
            ) : null}

            <h4 className="text-sm font-semibold text-muted">{labels.annotations}</h4>
            {annotations.length === 0 ? (
              <p className="text-sm text-muted">{labels.noAnnotations}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {annotations.map((annotation) => (
                  <li key={annotation.id} className="rounded-lg border border-line bg-canvas p-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPageNumber(annotation.page)}
                      className="font-medium text-accent-ink"
                    >
                      {labels.page} {annotation.page}
                    </button>
                    <p className="mt-1 text-muted">{annotation.note || "—"}</p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
