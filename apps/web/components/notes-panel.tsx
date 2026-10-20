"use client";

import type { NoteDto } from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { NOTES_ENDPOINT, noteEndpoint, notesListEndpoint } from "@/lib/api";

export interface NotesLabels {
  title: string;
  empty: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
  create: string;
  creating: string;
  remove: string;
}

export function NotesPanel({ spaceId, labels }: { spaceId: string; labels: NotesLabels }) {
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(notesListEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      const body = (await response.json()) as { notes: NoteDto[] };
      setNotes(body.notes);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = title.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setError(false);
      try {
        const response = await fetch(NOTES_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ spaceId, title: trimmed, contentMd: content }),
        });
        if (!response.ok) {
          setError(true);
          return;
        }
        const { note } = (await response.json()) as { note: NoteDto };
        setNotes((previous) => [note, ...previous]);
        setTitle("");
        setContent("");
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, content, spaceId, title],
  );

  const remove = useCallback(async (note: NoteDto) => {
    const response = await fetch(noteEndpoint(note.id), {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      setNotes((previous) => previous.filter((item) => item.id !== note.id));
    }
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{labels.title}</h3>
      <form onSubmit={create} className="mt-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={labels.titlePlaceholder}
          aria-label={labels.titlePlaceholder}
          maxLength={200}
          className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={labels.contentPlaceholder}
          aria-label={labels.contentPlaceholder}
          rows={4}
          className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={busy || title.trim().length === 0}
          className="self-start rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {busy ? labels.creating : labels.create}
        </button>
      </form>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">!</p> : null}

      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-medium">{note.title}</h4>
                <button
                  type="button"
                  onClick={() => void remove(note)}
                  className="text-xs text-muted hover:text-danger"
                >
                  {labels.remove}
                </button>
              </div>
              <div className="markdown mt-2 text-sm text-ink">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.contentMd}</ReactMarkdown>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
