import { createHmac, randomUUID } from "node:crypto";

import { and, eq, lte } from "drizzle-orm";

import {
  webhookDeliveries,
  webhookEndpoints,
  type Db,
  type WebhookDeliveryRow,
  type WebhookEndpointRow,
} from "@study-os/db";

export interface WebhookEventInput {
  spaceId: string;
  event: string;
  payload: Record<string, unknown>;
}

function parseEvents(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Queues a signed delivery for every enabled endpoint subscribed to the event. */
export async function queueWebhooks(db: Db, input: WebhookEventInput): Promise<number> {
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.spaceId, input.spaceId), eq(webhookEndpoints.enabled, true)));

  const matching = endpoints.filter((endpoint) => parseEvents(endpoint.events).includes(input.event));
  if (matching.length === 0) return 0;

  await db.insert(webhookDeliveries).values(
    matching.map((endpoint) => ({
      endpointId: endpoint.id,
      spaceId: input.spaceId,
      event: input.event,
      payload: JSON.stringify(input.payload),
    })),
  );
  return matching.length;
}

function signature(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

const MAX_ATTEMPTS = 3;

/** Attempts one delivery; used by the worker and the synchronous "test" route. */
export async function deliverDelivery(
  db: Db,
  delivery: WebhookDeliveryRow,
  endpoint: WebhookEndpointRow,
  fetchImpl: typeof fetch = fetch,
): Promise<WebhookDeliveryRow> {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    id: delivery.id,
    event: delivery.event,
    spaceId: delivery.spaceId,
    payload: JSON.parse(delivery.payload) as unknown,
    createdAt: delivery.createdAt.toISOString(),
  });
  const attempts = delivery.attempts + 1;

  try {
    const response = await fetchImpl(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-studyos-event": delivery.event,
        "x-studyos-delivery": delivery.id,
        "x-studyos-timestamp": String(timestamp),
        "x-studyos-signature": `v1=${signature(endpoint.secret, timestamp, body)}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });

    const success = response.ok;
    const [updated] = await db
      .update(webhookDeliveries)
      .set(
        success
          ? {
              status: "success",
              attempts,
              responseStatus: response.status,
              deliveredAt: new Date(),
              error: null,
            }
          : {
              status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
              attempts,
              responseStatus: response.status,
              error: `HTTP ${response.status}`,
              nextAttemptAt: new Date(Date.now() + attempts * 60_000),
            },
      )
      .where(eq(webhookDeliveries.id, delivery.id))
      .returning();
    return updated ?? delivery;
  } catch (error) {
    const [updated] = await db
      .update(webhookDeliveries)
      .set({
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        attempts,
        error: error instanceof Error ? error.message.slice(0, 500) : "delivery failed",
        nextAttemptAt: new Date(Date.now() + attempts * 60_000),
      })
      .where(eq(webhookDeliveries.id, delivery.id))
      .returning();
    return updated ?? delivery;
  }
}

/** Worker entry point: delivers due pending webhooks with backoff. */
export async function deliverDueWebhooks(
  db: Db,
  fetchImpl: typeof fetch = fetch,
): Promise<{ delivered: number; failed: number }> {
  const due = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(eq(webhookDeliveries.status, "pending"), lte(webhookDeliveries.nextAttemptAt, new Date())),
    )
    .limit(20);

  let delivered = 0;
  let failed = 0;
  for (const delivery of due) {
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, delivery.endpointId))
      .limit(1);
    if (!endpoint || !endpoint.enabled) {
      await db
        .update(webhookDeliveries)
        .set({ status: "failed", error: "endpoint disabled or missing" })
        .where(eq(webhookDeliveries.id, delivery.id));
      failed += 1;
      continue;
    }
    const result = await deliverDelivery(db, delivery, endpoint, fetchImpl);
    if (result.status === "success") delivered += 1;
    else if (result.status === "failed") failed += 1;
  }
  return { delivered, failed };
}

/** Creates and immediately attempts a test delivery. */
export async function testWebhook(
  db: Db,
  endpoint: WebhookEndpointRow,
  fetchImpl: typeof fetch = fetch,
): Promise<WebhookDeliveryRow | null> {
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      endpointId: endpoint.id,
      spaceId: endpoint.spaceId,
      event: "ping",
      payload: JSON.stringify({ message: "Study OS webhook test", nonce: randomUUID() }),
    })
    .returning();
  if (!delivery) return null;
  return deliverDelivery(db, delivery, endpoint, fetchImpl);
}
