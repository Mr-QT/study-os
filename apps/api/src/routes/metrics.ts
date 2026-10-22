import type { FastifyPluginAsync } from "fastify";

import { sql } from "drizzle-orm";

import {
  aiInvocations,
  examAttempts,
  notes,
  notifications,
  questions,
  spaces,
  tasks,
  users,
} from "@study-os/db";

async function tableCount(query: Promise<Array<{ total: string | null }>>): Promise<number> {
  const [row] = await query;
  return Number(row?.total ?? 0);
}

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/metrics", async (request, reply) => {
    const database = request.server.database;
    let dbUp = 0;
    const counts: Record<string, number> = {};
    if (database) {
      try {
        await database.db.execute(sql`select 1`);
        dbUp = 1;
        counts.users = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(users),
        );
        counts.spaces = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(spaces),
        );
        counts.tasks = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(tasks),
        );
        counts.notes = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(notes),
        );
        counts.questions = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(questions),
        );
        counts.exam_attempts = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(examAttempts),
        );
        counts.pending_notifications = await tableCount(
          database.db
            .select({ total: sql<string | null>`count(*)` })
            .from(notifications)
            .where(sql`${notifications.status} = 'pending'`),
        );
        counts.ai_invocations = await tableCount(
          database.db.select({ total: sql<string | null>`count(*)` }).from(aiInvocations),
        );
      } catch {
        dbUp = 0;
      }
    }

    const lines = [
      "# HELP studyos_up Whether the API process is running.",
      "# TYPE studyos_up gauge",
      "studyos_up 1",
      "# HELP studyos_database_up Whether the database is reachable.",
      "# TYPE studyos_database_up gauge",
      `studyos_database_up ${dbUp}`,
      "# HELP studyos_uptime_seconds Process uptime.",
      "# TYPE studyos_uptime_seconds gauge",
      `studyos_uptime_seconds ${Math.round(process.uptime())}`,
      "# HELP studyos_memory_rss_bytes Resident memory.",
      "# TYPE studyos_memory_rss_bytes gauge",
      `studyos_memory_rss_bytes ${process.memoryUsage().rss}`,
      "# HELP studyos_rows Total rows per table (aggregate, no user content).",
      "# TYPE studyos_rows gauge",
      ...Object.entries(counts).map(([table, value]) => `studyos_rows{table="${table}"} ${value}`),
      "",
    ];
    return reply.type("text/plain; version=0.0.4; charset=utf-8").send(lines.join("\n"));
  });
};
