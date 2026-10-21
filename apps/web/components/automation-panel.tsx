"use client";

import type {
  AutomationRuleDto,
  AutomationRunDto,
  NotificationDto,
  NotificationPreferenceDto,
  RuleDraft,
} from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  AUTOMATION_RULES_DRAFT_ENDPOINT,
  AUTOMATION_RULES_ENDPOINT,
  NOTIFICATION_DIGEST_ENDPOINT,
  NOTIFICATION_PREFERENCES_ENDPOINT,
  NOTIFICATIONS_DISPATCH_ENDPOINT,
  automationRuleEndpoint,
  automationRulesEndpoint,
  automationRunsEndpoint,
  notificationReadEndpoint,
  notificationsEndpoint,
} from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "自动化与通知",
    rules: "自动化规则",
    noRules: "还没有规则。",
    ruleName: "规则名称，例如：完成任务后提醒",
    notificationTitle: "通知标题，例如：任务完成",
    addRule: "添加规则",
    draftLabel: "用一句话生成规则（AI）",
    draftPlaceholder: "例如：完成任务后提醒我休息 10 分钟",
    draftCreate: "生成草案",
    draftSave: "保存规则",
    draftCancel: "取消",
    draftFailed: "生成失败，请重试",
    enable: "启用",
    disable: "停用",
    runs: "最近运行",
    noRuns: "暂无运行记录。",
    notifications: "通知",
    noNotifications: "暂无通知。",
    dispatch: "发送待处理通知",
    markRead: "标为已读",
    unread: "未读",
    prefsTitle: "免打扰与摘要",
    quietStart: "免打扰开始（小时）",
    quietEnd: "免打扰结束（小时）",
    digestHour: "摘要时间（小时）",
    digestEnabled: "启用每日摘要",
    savePrefs: "保存偏好",
    digestNow: "生成今日摘要",
    digestCreated: "摘要已生成。",
    digestSkipped: "今天已有摘要。",
  },
  en: {
    title: "Automation and notifications",
    rules: "Automation rules",
    noRules: "No rules yet.",
    ruleName: "Rule name, e.g. remind after task done",
    notificationTitle: "Notification title, e.g. Task done",
    addRule: "Add rule",
    draftLabel: "Describe a rule in one sentence (AI)",
    draftPlaceholder: "e.g. remind me to rest after finishing a task",
    draftCreate: "Draft rule",
    draftSave: "Save rule",
    draftCancel: "Cancel",
    draftFailed: "Draft failed, try again",
    enable: "Enable",
    disable: "Disable",
    runs: "Recent runs",
    noRuns: "No runs yet.",
    notifications: "Notifications",
    noNotifications: "No notifications yet.",
    dispatch: "Dispatch pending",
    markRead: "Mark read",
    unread: "unread",
    prefsTitle: "Quiet hours and digest",
    quietStart: "Quiet start (hour)",
    quietEnd: "Quiet end (hour)",
    digestHour: "Digest hour",
    digestEnabled: "Enable daily digest",
    savePrefs: "Save preferences",
    digestNow: "Create today's digest",
    digestCreated: "Digest created.",
    digestSkipped: "Digest already exists today.",
  },
} as const;

export function AutomationPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [rules, setRules] = useState<AutomationRuleDto[]>([]);
  const [runs, setRuns] = useState<AutomationRunDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [ruleName, setRuleName] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [draftError, setDraftError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferenceDto | null>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [digestMessage, setDigestMessage] = useState("");

  const load = useCallback(async () => {
    const [rulesResponse, runsResponse, notificationsResponse, prefsResponse] = await Promise.all([
      fetch(automationRulesEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(automationRunsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(notificationsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      fetch(NOTIFICATION_PREFERENCES_ENDPOINT, { credentials: "include", headers: { accept: "application/json" } }),
    ]);
    if (rulesResponse.ok) {
      setRules(((await rulesResponse.json()) as { rules: AutomationRuleDto[] }).rules);
    }
    if (runsResponse.ok) {
      setRuns(((await runsResponse.json()) as { runs: AutomationRunDto[] }).runs.slice(0, 5));
    }
    if (notificationsResponse.ok) {
      const body = (await notificationsResponse.json()) as {
        notifications: NotificationDto[];
        unread: number;
      };
      setNotifications(body.notifications);
      setUnread(body.unread);
    }
    if (prefsResponse.ok) {
      setPrefs(
        ((await prefsResponse.json()) as { preferences: NotificationPreferenceDto }).preferences,
      );
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addRule = useCallback(async () => {
    if (!ruleName.trim() || !notificationTitle.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(AUTOMATION_RULES_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          spaceId,
          name: ruleName.trim(),
          trigger: "task.completed",
          actions: [{ type: "create_notification", title: notificationTitle.trim() }],
        }),
      });
      if (response.ok) {
        setRuleName("");
        setNotificationTitle("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, load, notificationTitle, ruleName, spaceId]);

  const createDraft = useCallback(async () => {
    if (!draftText.trim() || busy) return;
    setBusy(true);
    setDraftError(false);
    try {
      const response = await fetch(AUTOMATION_RULES_DRAFT_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, text: draftText.trim() }),
      });
      if (response.ok) {
        setDraft((await response.json()) as RuleDraft);
      } else {
        setDraftError(true);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, draftText, spaceId]);

  const saveDraft = useCallback(async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const response = await fetch(AUTOMATION_RULES_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ spaceId, ...draft }),
      });
      if (response.ok) {
        setDraft(null);
        setDraftText("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, draft, load, spaceId]);

  const toggleRule = useCallback(
    async (rule: AutomationRuleDto) => {
      const response = await fetch(automationRuleEndpoint(rule.id), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (response.ok) await load();
    },
    [load],
  );

  const dispatch = useCallback(async () => {
    await fetch(NOTIFICATIONS_DISPATCH_ENDPOINT, { method: "POST", credentials: "include" });
    await load();
  }, [load]);

  const markRead = useCallback(
    async (notification: NotificationDto) => {
      await fetch(notificationReadEndpoint(notification.id), {
        method: "PATCH",
        credentials: "include",
      });
      await load();
    },
    [load],
  );

  const savePrefs = useCallback(async () => {
    if (!prefs || prefsBusy) return;
    setPrefsBusy(true);
    try {
      const response = await fetch(NOTIFICATION_PREFERENCES_ENDPOINT, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          quietStartHour: prefs.quietStartHour,
          quietEndHour: prefs.quietEndHour,
          digestHour: prefs.digestHour,
          digestEnabled: prefs.digestEnabled,
        }),
      });
      if (response.ok) {
        const body = (await response.json()) as { preferences: NotificationPreferenceDto };
        setPrefs(body.preferences);
      }
    } finally {
      setPrefsBusy(false);
    }
  }, [prefs, prefsBusy]);

  const createDigestNow = useCallback(async () => {
    const response = await fetch(NOTIFICATION_DIGEST_ENDPOINT, {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      const body = (await response.json()) as { created: boolean };
      setDigestMessage(body.created ? text.digestCreated : text.digestSkipped);
      await load();
    }
  }, [load, text.digestCreated, text.digestSkipped]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{text.title}</h3>
        <p className="text-xs text-muted">
          {unread} {text.unread}
        </p>
      </div>

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.rules}</h4>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={ruleName}
          onChange={(event) => setRuleName(event.target.value)}
          placeholder={text.ruleName}
          aria-label={text.ruleName}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          value={notificationTitle}
          onChange={(event) => setNotificationTitle(event.target.value)}
          placeholder={text.notificationTitle}
          aria-label={text.notificationTitle}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void addRule()}
          disabled={busy || !ruleName.trim() || !notificationTitle.trim()}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {text.addRule}
        </button>
      </div>
      {rules.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{text.noRules}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={rule.enabled ? "" : "text-muted line-through"}>{rule.name}</span>
              <button
                type="button"
                onClick={() => void toggleRule(rule)}
                className="rounded-lg border border-line px-2 py-1 text-xs hover:border-accent"
              >
                {rule.enabled ? text.disable : text.enable}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.draftLabel}</h4>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder={text.draftPlaceholder}
          aria-label={text.draftLabel}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void createDraft()}
          disabled={busy || !draftText.trim()}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
        >
          {text.draftCreate}
        </button>
      </div>
      {draftError ? <p className="mt-1 text-xs text-danger">{text.draftFailed}</p> : null}
      {draft ? (
        <div className="mt-2 rounded-xl border border-line bg-canvas p-3 text-sm">
          <p className="font-medium">{draft.name}</p>
          <p className="mt-1 text-xs text-muted">
            {draft.trigger} · {draft.actions.map((action) => action.title).join(", ")}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={busy}
              className="rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
            >
              {text.draftSave}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs"
            >
              {text.draftCancel}
            </button>
          </div>
        </div>
      ) : null}

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.runs}</h4>
      {runs.length === 0 ? (
        <p className="mt-1 text-xs text-muted">{text.noRuns}</p>
      ) : (
        <ul className="mt-1 text-xs text-muted">
          {runs.map((run) => (
            <li key={run.id}>
              {run.trigger} · {run.status} · {new Date(run.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-muted">{text.notifications}</h4>
        <button
          type="button"
          onClick={() => void dispatch()}
          className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent"
        >
          {text.dispatch}
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{text.noNotifications}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
            >
              <span className={notification.readAt ? "text-muted" : "font-medium"}>
                {notification.title}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {notification.status}
                {!notification.readAt ? (
                  <button
                    type="button"
                    onClick={() => void markRead(notification)}
                    className="hover:text-accent-ink"
                  >
                    {text.markRead}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-4 text-sm font-semibold text-muted">{text.prefsTitle}</h4>
      {prefs ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2 text-xs text-muted">
            <label>
              {text.quietStart}
              <input
                type="number"
                min={0}
                max={23}
                value={prefs.quietStartHour}
                onChange={(event) =>
                  setPrefs({ ...prefs, quietStartHour: Number(event.target.value) })
                }
                className="ml-1 w-16 rounded-lg border border-line bg-canvas px-2 py-1 text-sm text-ink"
              />
            </label>
            <label>
              {text.quietEnd}
              <input
                type="number"
                min={0}
                max={23}
                value={prefs.quietEndHour}
                onChange={(event) =>
                  setPrefs({ ...prefs, quietEndHour: Number(event.target.value) })
                }
                className="ml-1 w-16 rounded-lg border border-line bg-canvas px-2 py-1 text-sm text-ink"
              />
            </label>
            <label>
              {text.digestHour}
              <input
                type="number"
                min={0}
                max={23}
                value={prefs.digestHour}
                onChange={(event) => setPrefs({ ...prefs, digestHour: Number(event.target.value) })}
                className="ml-1 w-16 rounded-lg border border-line bg-canvas px-2 py-1 text-sm text-ink"
              />
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={prefs.digestEnabled}
                onChange={(event) => setPrefs({ ...prefs, digestEnabled: event.target.checked })}
              />
              {text.digestEnabled}
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void savePrefs()}
              disabled={prefsBusy}
              className="rounded-lg bg-accent-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
            >
              {text.savePrefs}
            </button>
            <button
              type="button"
              onClick={() => void createDigestNow()}
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent"
            >
              {text.digestNow}
            </button>
          </div>
          {digestMessage ? <p className="text-xs text-ok">{digestMessage}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
