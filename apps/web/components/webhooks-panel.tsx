"use client";

import type {
  WebhookDeliveryDto,
  WebhookEndpointDto,
  WebhookEvent,
} from "@study-os/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  webhookDeliveriesEndpoint,
  webhookEndpoint,
  webhookTestEndpoint,
  webhooksEndpoint,
} from "@/lib/api";

const TEXT = {
  "zh-CN": {
    title: "Webhook（出站）",
    urlPlaceholder: "https://example.com/hook",
    events: "订阅事件",
    create: "创建 Webhook",
    secretHint: "密钥只显示一次，用于校验 HMAC-SHA256 签名：",
    copy: "复制",
    copied: "已复制",
    test: "发送测试",
    remove: "删除",
    deliveries: "最近投递",
    noDeliveries: "还没有投递记录。",
    noEndpoints: "还没有 Webhook。",
    enable: "启用",
    disable: "停用",
    eventTask: "任务完成",
    eventFocus: "专注结束",
    eventExam: "考试提交",
    eventComment: "评论创建",
  },
  en: {
    title: "Webhooks (outbound)",
    urlPlaceholder: "https://example.com/hook",
    events: "Events",
    create: "Create webhook",
    secretHint: "Secret is shown once; use it to verify HMAC-SHA256 signatures:",
    copy: "Copy",
    copied: "Copied",
    test: "Send test",
    remove: "Delete",
    deliveries: "Recent deliveries",
    noDeliveries: "No deliveries yet.",
    noEndpoints: "No webhooks yet.",
    enable: "Enable",
    disable: "Disable",
    eventTask: "Task completed",
    eventFocus: "Focus completed",
    eventExam: "Exam submitted",
    eventComment: "Comment created",
  },
} as const;

const EVENT_OPTIONS: Array<{ value: WebhookEvent; zh: string; en: string }> = [
  { value: "task.completed", zh: TEXT["zh-CN"].eventTask, en: TEXT.en.eventTask },
  { value: "focus.completed", zh: TEXT["zh-CN"].eventFocus, en: TEXT.en.eventFocus },
  { value: "exam.submitted", zh: TEXT["zh-CN"].eventExam, en: TEXT.en.eventExam },
  { value: "comment.created", zh: TEXT["zh-CN"].eventComment, en: TEXT.en.eventComment },
];

export function WebhooksPanel({ spaceId, locale }: { spaceId: string; locale: string }) {
  const text = locale === "en" ? TEXT.en : TEXT["zh-CN"];
  const [endpoints, setEndpoints] = useState<WebhookEndpointDto[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["task.completed"]);
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryDto[]>([]);
  const [deliveryTarget, setDeliveryTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(webhooksEndpoint(spaceId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      setEndpoints(((await response.json()) as { endpoints: WebhookEndpointDto[] }).endpoints);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    if (!url.trim() || events.length === 0 || busy) return;
    setBusy(true);
    try {
      const response = await fetch(webhooksEndpoint(spaceId), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      if (response.ok) {
        const body = (await response.json()) as { secret: string };
        setSecret(body.secret);
        setUrl("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, events, load, spaceId, url]);

  const test = useCallback(
    async (endpoint: WebhookEndpointDto) => {
      const response = await fetch(webhookTestEndpoint(endpoint.id), {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const body = (await response.json()) as { delivery: WebhookDeliveryDto | null };
        setDeliveries(body.delivery ? [body.delivery] : []);
        setDeliveryTarget(endpoint.id);
      }
    },
    [],
  );

  const showDeliveries = useCallback(async (endpoint: WebhookEndpointDto) => {
    const response = await fetch(webhookDeliveriesEndpoint(endpoint.id), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      setDeliveries(((await response.json()) as { deliveries: WebhookDeliveryDto[] }).deliveries);
      setDeliveryTarget(endpoint.id);
    }
  }, []);

  const toggle = useCallback(
    async (endpoint: WebhookEndpointDto) => {
      await fetch(webhookEndpoint(endpoint.id), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !endpoint.enabled }),
      });
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (endpoint: WebhookEndpointDto) => {
      await fetch(webhookEndpoint(endpoint.id), { method: "DELETE", credentials: "include" });
      await load();
    },
    [load],
  );

  const toggleEvent = (event: WebhookEvent) => {
    setEvents((previous) =>
      previous.includes(event) ? previous.filter((item) => item !== event) : [...previous, event],
    );
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-semibold">{text.title}</h3>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={text.urlPlaceholder}
          aria-label={text.urlPlaceholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy || !url.trim() || events.length === 0}
          className="rounded-xl bg-accent-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50"
        >
          {text.create}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        <span>{text.events}:</span>
        {EVENT_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={events.includes(option.value)}
              onChange={() => toggleEvent(option.value)}
            />
            {locale === "en" ? option.en : option.zh}
          </label>
        ))}
      </div>

      {secret ? (
        <div className="mt-3 rounded-xl border border-line bg-canvas p-3 text-xs">
          <p className="text-muted">{text.secretHint}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-surface px-2 py-1">{secret}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(secret);
                setCopied(true);
              }}
              className="text-accent-ink hover:underline"
            >
              {copied ? text.copied : text.copy}
            </button>
          </div>
        </div>
      ) : null}

      {endpoints.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{text.noEndpoints}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {endpoints.map((endpoint) => (
            <li key={endpoint.id} className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-all">{endpoint.url}</span>
                <span className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => void test(endpoint)}
                    className="text-accent-ink hover:underline"
                  >
                    {text.test}
                  </button>
                  <button
                    type="button"
                    onClick={() => void showDeliveries(endpoint)}
                    className="text-muted hover:text-accent-ink"
                  >
                    {text.deliveries}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggle(endpoint)}
                    className="text-muted hover:text-accent-ink"
                  >
                    {endpoint.enabled ? text.disable : text.enable}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(endpoint)}
                    className="text-muted hover:text-danger"
                  >
                    {text.remove}
                  </button>
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{endpoint.events.join(", ")}</p>
              {deliveryTarget === endpoint.id && deliveries.length > 0 ? (
                <ul className="mt-1 text-xs text-muted">
                  {deliveries.slice(0, 3).map((delivery) => (
                    <li key={delivery.id}>
                      {delivery.event} · {delivery.status} · {delivery.attempts}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
