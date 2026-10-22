"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { joinInviteEndpoint } from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "有邀请码？加入一个空间",
    placeholder: "粘贴邀请码",
    join: "加入",
    joining: "加入中…",
    success: "已加入！",
    open: "打开空间",
    failed: "邀请码无效、已过期或已用完。",
  },
  en: {
    title: "Have an invite code? Join a space",
    placeholder: "Paste invite code",
    join: "Join",
    joining: "Joining…",
    success: "Joined!",
    open: "Open space",
    failed: "Invite is invalid, expired or used up.",
  },
} as const;

export function JoinSpaceForm({ locale }: { locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [spaceId, setSpaceId] = useState("");
  const [error, setError] = useState("");

  const join = useCallback(async () => {
    if (!token.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(joinInviteEndpoint(token.trim()), {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const body = (await response.json()) as { spaceId: string };
        setSpaceId(body.spaceId);
        setToken("");
      } else {
        setError(text.failed);
      }
    } catch {
      setError(text.failed);
    } finally {
      setBusy(false);
    }
  }, [busy, text.failed, token]);

  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-muted">{text.title}</h2>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={text.placeholder}
          aria-label={text.placeholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void join()}
          disabled={busy || !token.trim()}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
        >
          {busy ? text.joining : text.join}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {spaceId ? (
        <p className="mt-2 text-sm text-ok">
          {text.success}{" "}
          <Link href={`/${locale}/spaces/${spaceId}`} className="underline">
            {text.open}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
