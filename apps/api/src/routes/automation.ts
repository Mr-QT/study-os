import type { FastifyPluginAsync } from "fastify";

import { and, desc, eq } from "drizzle-orm";

import {
  automationActionSchema,
  automationRuleListResponseSchema,
  automationRuleResponseSchema,
  automationRuleSchema,
  automationRunListResponseSchema,
  createAutomationRuleInputSchema,
  dispatchResponseSchema,
  dryRunInputSchema,
  dryRunResponseSchema,
  idParamSchema,
  notificationListResponseSchema,
  notificationSchema,
  spaceQuerySchema,
  updateAutomationRuleInputSchema,
  type AutomationRuleDto,
} from "@study-os/contracts";
import {
  automationRules,
  automationRuns,
  notifications,
  type AutomationRuleRow,
  type NotificationRow,
} from "@study-os/db";

import { matchRule } from "../automation/engine";
import { dispatchDueNotifications } from "../notifications/dispatch";
import { requireUser } from "../auth/require-user";
import { ensureSpaceAccess } from "../auth/space-access";
import { notFound, validationError } from "../http/errors";

function toRuleDto(row: AutomationRuleRow): AutomationRuleDto {
  let conditions: Record<string, string | number | boolean> = {};
  let actions: AutomationRuleDto["actions"] = [];
  try {
    conditions = JSON.parse(row.conditions) as Record<string, string | number | boolean>;
  } catch {
    conditions = {};
  }
  try {
    actions = JSON.parse(row.actions) as AutomationRuleDto["actions"];
  } catch {
    actions = [];
  }
  return automationRuleSchema.parse({
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    conditions,
    actions,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function toNotificationDto(row: NotificationRow) {
  return notificationSchema.parse({
    id: row.id,
    title: row.title,
    body: row.body,
    channel: row.channel,
    status: row.status,
    scheduledAt: row.scheduledAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

export const automationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/automation/rules", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }
    const rows = await database.db
      .select()
      .from(automationRules)
      .where(eq(automationRules.spaceId, query.data.spaceId))
      .orderBy(desc(automationRules.updatedAt));
    return automationRuleListResponseSchema.parse({ rules: rows.map(toRuleDto) });
  });

  app.post("/api/v1/automation/rules", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = createAutomationRuleInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, parsed.data.spaceId, true)) !== "ok") {
      return notFound(reply);
    }

    const [rule] = await database.db
      .insert(automationRules)
      .values({
        spaceId: parsed.data.spaceId,
        userId: user.id,
        name: parsed.data.name,
        trigger: parsed.data.trigger,
        conditions: JSON.stringify(parsed.data.conditions ?? {}),
        actions: JSON.stringify(parsed.data.actions),
        enabled: parsed.data.enabled ?? true,
      })
      .returning();
    if (!rule) return reply;
    return reply.code(201).send(automationRuleResponseSchema.parse({ rule: toRuleDto(rule) }));
  });

  app.patch("/api/v1/automation/rules/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = updateAutomationRuleInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [existing] = await database.db
      .select()
      .from(automationRules)
      .where(and(eq(automationRules.id, params.data.id), eq(automationRules.userId, user.id)))
      .limit(1);
    if (!existing) return notFound(reply);

    const [updated] = await database.db
      .update(automationRules)
      .set({
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
        ...(parsed.data.conditions === undefined
          ? {}
          : { conditions: JSON.stringify(parsed.data.conditions) }),
        ...(parsed.data.actions === undefined
          ? {}
          : { actions: JSON.stringify(parsed.data.actions) }),
        ...(parsed.data.enabled === undefined ? {} : { enabled: parsed.data.enabled }),
        updatedAt: new Date(),
      })
      .where(eq(automationRules.id, existing.id))
      .returning();
    if (!updated) return notFound(reply);
    return automationRuleResponseSchema.parse({ rule: toRuleDto(updated) });
  });

  app.delete("/api/v1/automation/rules/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const deleted = await database.db
      .delete(automationRules)
      .where(and(eq(automationRules.id, params.data.id), eq(automationRules.userId, user.id)))
      .returning();
    if (deleted.length === 0) return notFound(reply);
    return reply.code(204).send();
  });

  app.get("/api/v1/automation/runs", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const query = spaceQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error.flatten());
    if ((await ensureSpaceAccess(database.db, user.id, query.data.spaceId, false)) !== "ok") {
      return notFound(reply);
    }
    const rows = await database.db
      .select({ run: automationRuns, rule: automationRules })
      .from(automationRuns)
      .innerJoin(automationRules, eq(automationRules.id, automationRuns.ruleId))
      .where(eq(automationRules.spaceId, query.data.spaceId))
      .orderBy(desc(automationRuns.createdAt))
      .limit(50);
    return automationRunListResponseSchema.parse({
      runs: rows.map(({ run }) => ({
        id: run.id,
        ruleId: run.ruleId,
        trigger: run.trigger,
        status: run.status,
        message: run.message,
        createdAt: run.createdAt.toISOString(),
      })),
    });
  });

  app.post("/api/v1/automation/rules/:id/dry-run", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const parsed = dryRunInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const [rule] = await database.db
      .select()
      .from(automationRules)
      .where(and(eq(automationRules.id, params.data.id), eq(automationRules.userId, user.id)))
      .limit(1);
    if (!rule) return notFound(reply);

    const context = parsed.data.context ?? {};
    const matched = matchRule(rule.conditions, context);
    const actions = matched
      ? (JSON.parse(rule.actions) as unknown[]).map((action) => automationActionSchema.parse(action))
      : [];
    return dryRunResponseSchema.parse({ matched, actions });
  });

  app.get("/api/v1/notifications", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const raw = request.query as { spaceId?: string };
    const conditions = [eq(notifications.userId, user.id)];
    if (raw.spaceId) conditions.push(eq(notifications.spaceId, raw.spaceId));

    const rows = await database.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const unread = rows.filter((row) => row.readAt === null && row.status !== "failed").length;
    return notificationListResponseSchema.parse({
      notifications: rows.map(toNotificationDto),
      unread,
    });
  });

  app.patch("/api/v1/notifications/:id/read", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const [updated] = await database.db
      .update(notifications)
      .set({ readAt: new Date(), status: "read" })
      .where(and(eq(notifications.id, params.data.id), eq(notifications.userId, user.id)))
      .returning();
    if (!updated) return notFound(reply);
    return notificationSchema.parse(toNotificationDto(updated));
  });

  app.post("/api/v1/notifications/dispatch", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const result = await dispatchDueNotifications(database.db, user.id);
    return dispatchResponseSchema.parse(result);
  });
};
