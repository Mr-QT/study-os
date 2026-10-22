"use client";

import type { MediaTextResponse } from "@study-os/contracts";
import { useCallback, useState } from "react";

import { NOTES_ENDPOINT, mediaEndpoint } from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "图片 OCR 与音频转写（本地）",
    mode: "类型",
    ocr: "图片 OCR",
    transcribe: "音频转写",
    file: "选择图片或音频",
    imageHint: "支持 PNG/JPEG/WebP",
    audioHint: "仅支持 16-bit PCM WAV",
    run: "开始识别",
    running: "处理中…（首次会下载本地模型）",
    result: "识别结果",
    save: "保存为笔记",
    saving: "保存中…",
    saved: "已保存为笔记。",
    empty: "还没有结果。",
    failed: "识别失败，请检查文件。",
  },
  en: {
    title: "Image OCR and audio transcription (local)",
    mode: "Type",
    ocr: "Image OCR",
    transcribe: "Audio transcription",
    file: "Choose media file",
    imageHint: "PNG/JPEG/WebP",
    audioHint: "16-bit PCM WAV only",
    run: "Run",
    running: "Processing… (first run downloads the local model)",
    result: "Result",
    save: "Save as note",
    saving: "Saving…",
    saved: "Saved as a note.",
    empty: "No result yet.",
    failed: "Failed. Check the file.",
  },
} as const;

export function MediaPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [mode, setMode] = useState<"ocr" | "transcribe">("ocr");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const run = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    setResult("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(mediaEndpoint(mode, spaceId), {
        method: "POST",
        credentials: "include",
        body,
      });
      if (response.ok) {
        const payload = (await response.json()) as MediaTextResponse;
        setResult(payload.text);
      } else {
        setMessage(text.failed);
      }
    } catch {
      setMessage(text.failed);
    } finally {
      setBusy(false);
    }
  }, [busy, file, mode, spaceId, text.failed]);

  const save = useCallback(async () => {
    if (!result.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch(NOTES_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          spaceId,
          title: mode === "ocr" ? `OCR ${new Date().toLocaleString()}` : `转写 ${new Date().toLocaleString()}`,
          contentMd: result,
        }),
      });
      if (response.ok) setMessage(text.saved);
    } finally {
      setSaving(false);
    }
  }, [mode, result, saving, spaceId, text.saved]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{text.title}</h3>

      <div className="mt-3 flex flex-wrap items-end gap-3 text-xs text-muted">
        <label>
          {text.mode}
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as "ocr" | "transcribe");
              setFile(null);
              setResult("");
            }}
            className="ml-2 rounded-lg border border-line bg-canvas px-2 py-1 text-sm"
          >
            <option value="ocr">{text.ocr}</option>
            <option value="transcribe">{text.transcribe}</option>
          </select>
        </label>
        <label>
          {text.file}
          <input
            type="file"
            accept={mode === "ocr" ? "image/png,image/jpeg,image/webp" : ".wav,audio/wav"}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="ml-2 text-xs"
          />
        </label>
        <span>{mode === "ocr" ? text.imageHint : text.audioHint}</span>
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !file}
        className="mt-3 rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
      >
        {busy ? text.running : text.run}
      </button>
      {message ? <p className="mt-2 text-xs text-danger">{message}</p> : null}

      <label className="mt-4 block text-xs text-muted">
        {text.result}
        <textarea
          value={result}
          onChange={(event) => setResult(event.target.value)}
          placeholder={text.empty}
          rows={5}
          className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </label>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !result.trim()}
        className="mt-2 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
      >
        {saving ? text.saving : text.save}
      </button>
    </section>
  );
}
