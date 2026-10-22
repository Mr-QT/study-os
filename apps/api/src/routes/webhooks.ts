import { randomBytes } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq } from "drizzle-orm";

import {
  createWebhookInputSchema,
  idParamSchema,
  updateWebhookInputSchema,
  webhookDeliveryListResponseSchema,
  webhookDeliverySchema,
  webhookEndpointListResponseSchema,
  webhookEndpointResponseSchema,
  webhookEndpointSchema,
  webhookEndpointSecretResponseSchema,
  webhookTestResponseSchema,
  type WebhookEndpointDto,
} from "@study-os/contracts";
import {
  webhookDeliveries,
  webhookEndpoints,
  type WebhookDeliveryRow,
  type WebhookEndpointRow,
} from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";
import { testWebhook } from "../webhooks/dispatch";

function toEndpointDto(row: WebhookEndpointRow): WebhookEndpointDto {
  let events: WebhookEndpointDto["events"] = [];
  try {
    const parsed: unknown = JSON.parse(row.events);
    if (Array.isArray(parsed)) {
      events = parsed.filter((item): item is WebhookEndpointDto["events"][number] =>
        typeof item === "string",
      );
    }
  } catch {
    events = [];
  }
  return webhookEndpointSchema.parse({
    id: row.id,
    url: row.url,
    events,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function toDeliveryDto(row: WebhookDeliveryRow) {
  return webhookDeliverySchema.parse({
    id: row.id,
    event: row.event,
    status: row.status,
    attempts: row.attempts,
    responseStatus: row.responseStatus,
    error: row.error,
    nextAttemptAt: row.nextAttemptAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
  });
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/spaces/:id/webhooks", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, params.data.id, false)) !== "ok") {
      return notFound(reply);
    }
    const rows = await database.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.spaceId, params.data.id))
      .orderBy(desc(webhookEndpoints.createdAt));
    return webhookEndpointListResponseSchema.parse({
      endpoints: rows.map(toEndpointDto),
    });
  });

  app.post("/api/v1/spaces/:id/webhooks", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, params.data.id, true)) !== "ok") {
      return notFound(reply);
    }
    const parsed = createWebhookInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const secret = randomBytes(32).toString("hex");
    const [endpoint] = await database.db
      .insert(webhookEndpoints)
      .values({
        spaceId: params.data.id,
        userId: user.id,
        url: parsed.data.url,
        secret,
        events: JSON.stringify(parsed.data.events),
        enabled: parsed.data.enabled ?? true,
      })
      .returning();
    if (!endpoint) return reply;
    return reply.code(201).send(
      webhookEndpointSecretResponseSchema.parse({
        endpoint: toEndpointDto(endpoint),
        secret,
      }),
    );
  });

  app.patch("/api/v1/webhooks/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateWebhookInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [endpoint] = await database.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.data.id))
      .limit(1);
    if (!endpoint) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, endpoint.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const [updated] = await database.db
      .update(webhookEndpoints)
      .set({
        ...(parsed.data.url === undefined ? {} : { url: parsed.data.url }),
        ...(parsed.data.events === undefined
          ? {}
          : { events: JSON.stringify(parsed.data.events) }),
        ...(parsed.data.enabled === undefined ? {} : { enabled: parsed.data.enabled }),
        updatedAt: new Date(),
      })
      .where(eq(webhookEndpoints.id, endpoint.id))
      .returning();
    if (!updated) return notFound(reply);
    return webhookEndpointResponseSchema.parse({ endpoint: toEndpointDto(updated) });
  });

  app.delete("/api/v1/webhooks/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [endpoint] = await database.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.data.id))
      .limit(1);
    if (!endpoint) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, endpoint.spaceId, true)) !== "ok") {
      return notFound(reply);
    }
    await database.db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, endpoint.id));
    return reply.code(204).send();
  });

  app.post("/api/v1/webhooks/:id/test", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [endpoint] = await database.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.data.id))
      .limit(1);
    if (!endpoint) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, endpoint.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const delivery = await testWebhook(database.db, endpoint);
    return webhookTestResponseSchema.parse({
      delivery: delivery ? toDeliveryDto(delivery) : null,
    });
  });

  app.get("/api/v1/webhooks/:id/deliveries", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [endpoint] = await database.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, params.data.id))
      .limit(1);
    if (!endpoint) return notFound(reply);
    if ((await ensureSpaceAccess(database.db, user.id, endpoint.spaceId, false)) !== "ok") {
      return notFound(reply);
    }

    const rows = await database.db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.endpointId, endpoint.id)))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(20);
    return webhookDeliveryListResponseSchema.parse({
      deliveries: rows.map(toDeliveryDto),
    });
  });
};
