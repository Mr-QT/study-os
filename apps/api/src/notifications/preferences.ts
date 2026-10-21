import { and, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";

import { calendarEvents, memberships, notifications, notificationPreferences, tasks, type Db } from "@study-os/db";

export interface PreferenceValues {
  timezone: string;
  quietStartHour: number;
  quietEndHour: number;
  digestHour: number;
  digestEnabled: boolean;
  updatedAt: Date;
}

const DEFAULTS = {
  timezone: "Asia/Shanghai",
  quietStartHour: 22,
  quietEndHour: 8,
  digestHour: 20,
  digestEnabled: false,
};

export async function getPreferences(db: Db, userId: string): Promise<PreferenceValues> {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (existing) {
    return {
      timezone: existing.timezone,
      quietStartHour: existing.quietStartHour,
      quietEndHour: existing.quietEndHour,
      digestHour: existing.digestHour,
      digestEnabled: existing.digestEnabled,
      updatedAt: existing.updatedAt,
    };
  }
  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId, ...DEFAULTS })
    .returning();
  return {
    timezone: created?.timezone ?? DEFAULTS.timezone,
    quietStartHour: created?.quietStartHour ?? DEFAULTS.quietStartHour,
    quietEndHour: created?.quietEndHour ?? DEFAULTS.quietEndHour,
    digestHour: created?.digestHour ?? DEFAULTS.digestHour,
    digestEnabled: created?.digestEnabled ?? DEFAULTS.digestEnabled,
    updatedAt: created?.updatedAt ?? new Date(),
  };
}

export function localHour(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  return hour % 24;
}

export function isQuietHour(hour: number, startHour: number, endHour: number): boolean {
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

/** Moves a timestamp forward until it leaves the quiet window (approximate DST-safe). */
export function nextAllowedTime(date: Date, prefs: PreferenceValues): Date {
  let candidate = new Date(date);
  for (let step = 0; step < 48; step += 1) {
    const hour = localHour(candidate, prefs.timezone);
    if (!isQuietHour(hour, prefs.quietStartHour, prefs.quietEndHour)) return candidate;
    candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
  }
  return candidate;
}

export function localDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

async function memberSpaceIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ spaceId: memberships.spaceId })
    .from(memberships)
    .where(eq(memberships.userId, userId));
  return rows.map((row) => row.spaceId);
}

export async function createDigest(db: Db, userId: string, now = new Date()) {
  const prefs = await getPreferences(db, userId);
  const key = `digest:${localDateKey(now, prefs.timezone)}`;
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.dedupeKey, key)))
    .limit(1);
  if (existing) return null;

  const spaceIds = await memberSpaceIds(db, userId);
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [eventCount] = spaceIds.length
    ? await db
        .select({ total: sql<string | null>`count(*)` })
        .from(calendarEvents)
        .where(
          and(
            inArray(calendarEvents.spaceId, spaceIds),
            gte(calendarEvents.startsAt, now),
            lt(calendarEvents.startsAt, horizon),
          ),
        )
    : [{ total: "0" }];

  const [taskStats] = spaceIds.length
    ? await db
        .select({
          due: sql<string | null>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueAt} < ${horizon})`,
          overdue: sql<string | null>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueAt} < ${now})`,
        })
        .from(tasks)
        .where(and(inArray(tasks.spaceId, spaceIds), isNull(tasks.deletedAt)))
    : [{ due: "0", overdue: "0" }];

  const [unread] = await db
    .select({ total: sql<string | null>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        ne(notifications.status, "failed"),
      ),
    );

  const body =
    `未来 24 小时：${Number(eventCount?.total ?? 0)} 个日程；` +
    `待办 ${Number(taskStats?.due ?? 0)} 个（逾期 ${Number(taskStats?.overdue ?? 0)} 个）；` +
    `未读通知 ${Number(unread?.total ?? 0)} 条。`;

  const [created] = await db
    .insert(notifications)
    .values({
      userId,
      title: "今日学习摘要",
      body,
      channel: "in_app",
      status: "pending",
      scheduledAt: nextAllowedTime(now, prefs),
      dedupeKey: key,
    })
    .returning();
  return created ?? null;
}

export async function digestCandidates(db: Db, now = new Date()): Promise<string[]> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.digestEnabled, true));
  return rows
    .filter((row) => localHour(now, row.timezone) === row.digestHour)
    .map((row) => row.userId);
}
