import { and, eq, gte, sql } from "drizzle-orm";

import { aiInvocations, type Db } from "@study-os/db";

export function estimateCostMicros(
  promptChars: number,
  completionChars: number,
  costPer1kUsd: number,
): number {
  const tokens = (promptChars + completionChars) / 4;
  return Math.max(0, Math.round((tokens / 1000) * costPer1kUsd * 1_000_000));
}

export function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function monthlySpendMicros(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string | null>`sum(${aiInvocations.estimatedCostMicros})` })
    .from(aiInvocations)
    .where(
      and(
        eq(aiInvocations.userId, userId),
        eq(aiInvocations.status, "ok"),
        gte(aiInvocations.createdAt, monthStart()),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function monthlyCalls(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string | null>`count(*)` })
    .from(aiInvocations)
    .where(and(eq(aiInvocations.userId, userId), gte(aiInvocations.createdAt, monthStart())));
  return Number(row?.total ?? 0);
}
