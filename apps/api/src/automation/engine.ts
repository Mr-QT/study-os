import { and, eq } from "drizzle-orm";

import type { AutomationAction, AutomationTrigger } from "@study-os/contracts";
import { automationRules, automationRuns, notifications, tasks, type Db } from "@study-os/db";

export interface AutomationEvent {
  trigger: AutomationTrigger;
  spaceId: string;
  userId: string;
  context: Record<string, string | number | boolean>;
}

function conditionsMatch(
  conditions: Record<string, string | number | boolean>,
  context: Record<string, string | number | boolean>,
): boolean {
  return Object.entries(conditions).every(([key, value]) => context[key] === value);
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function performAction(
  db: Db,
  event: AutomationEvent,
  action: AutomationAction,
): Promise<void> {
  if (action.type === "create_notification") {
    await db.insert(notifications).values({
      userId: event.userId,
      spaceId: event.spaceId,
      title: action.title,
      body: action.body ?? null,
      channel: "in_app",
      status: "pending",
    });
    return;
  }
  const dueInDays = action.dueInDays ?? 1;
  await db.insert(tasks).values({
    spaceId: event.spaceId,
    title: action.title,
    notes: action.body ?? null,
    dueAt: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
  });
}

/** Evaluates enabled rules for an event and performs their actions. */
export async function runAutomations(db: Db, event: AutomationEvent): Promise<number> {
  const rules = await db
    .select()
    .from(automationRules)
    .where(
      and(
        eq(automationRules.spaceId, event.spaceId),
        eq(automationRules.trigger, event.trigger),
        eq(automationRules.enabled, true),
      ),
    );

  let matched = 0;
  for (const rule of rules) {
    const conditions = parseJson<Record<string, string | number | boolean>>(rule.conditions, {});
    if (!conditionsMatch(conditions, event.context)) continue;
    matched += 1;
    try {
      const actions = parseJson<AutomationAction[]>(rule.actions, []);
      for (const action of actions) {
        await performAction(db, event, action);
      }
      await db.insert(automationRuns).values({
        ruleId: rule.id,
        userId: event.userId,
        trigger: event.trigger,
        status: "ok",
        message: `actions=${actions.length}`,
      });
    } catch (error) {
      await db.insert(automationRuns).values({
        ruleId: rule.id,
        userId: event.userId,
        trigger: event.trigger,
        status: "error",
        message: error instanceof Error ? error.message.slice(0, 500) : "unknown error",
      });
    }
  }
  return matched;
}

export function matchRule(
  conditionsRaw: string,
  context: Record<string, string | number | boolean>,
): boolean {
  return conditionsMatch(parseJson(conditionsRaw, {}), context);
}
