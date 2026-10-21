import { and, eq, lte } from "drizzle-orm";

import { notifications, type Db } from "@study-os/db";

export interface DispatchResult {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Delivers due pending notifications. Only the in-app channel has a real
 * transport today; email/PWA are counted as skipped until providers exist.
 */
export async function dispatchDueNotifications(
  db: Db,
  userId?: string,
): Promise<DispatchResult> {
  const conditions = [
    eq(notifications.status, "pending"),
    lte(notifications.scheduledAt, new Date()),
  ];
  if (userId) conditions.push(eq(notifications.userId, userId));

  const due = await db
    .select()
    .from(notifications)
    .where(and(...conditions));

  let sent = 0;
  let skipped = 0;
  for (const notification of due) {
    if (notification.channel !== "in_app") {
      skipped += 1;
      continue;
    }
    await db
      .update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notifications.id, notification.id));
    sent += 1;
  }
  return { sent, skipped, failed: 0 };
}
