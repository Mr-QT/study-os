import type { FastifyPluginAsync } from "fastify";

import {
  digestResponseSchema,
  notificationPreferenceResponseSchema,
  notificationSchema,
  updateNotificationPreferenceInputSchema,
} from "@study-os/contracts";
import { notificationPreferences } from "@study-os/db";

import { requireUser } from "../auth/require-user";
import { validationError } from "../http/errors";
import { createDigest, getPreferences } from "../notifications/preferences";

export const notificationPreferenceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/notifications/preferences", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const preferences = await getPreferences(database.db, user.id);
    return notificationPreferenceResponseSchema.parse({
      preferences: {
        timezone: preferences.timezone,
        quietStartHour: preferences.quietStartHour,
        quietEndHour: preferences.quietEndHour,
        digestHour: preferences.digestHour,
        digestEnabled: preferences.digestEnabled,
        updatedAt: preferences.updatedAt.toISOString(),
      },
    });
  });

  app.patch("/api/v1/notifications/preferences", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const parsed = updateNotificationPreferenceInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const preferences = await getPreferences(database.db, user.id);
    const [updated] = await database.db
      .insert(notificationPreferences)
      .values({
        userId: user.id,
        timezone: parsed.data.timezone ?? preferences.timezone,
        quietStartHour: parsed.data.quietStartHour ?? preferences.quietStartHour,
        quietEndHour: parsed.data.quietEndHour ?? preferences.quietEndHour,
        digestHour: parsed.data.digestHour ?? preferences.digestHour,
        digestEnabled: parsed.data.digestEnabled ?? preferences.digestEnabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...(parsed.data.timezone === undefined ? {} : { timezone: parsed.data.timezone }),
          ...(parsed.data.quietStartHour === undefined
            ? {}
            : { quietStartHour: parsed.data.quietStartHour }),
          ...(parsed.data.quietEndHour === undefined
            ? {}
            : { quietEndHour: parsed.data.quietEndHour }),
          ...(parsed.data.digestHour === undefined
            ? {}
            : { digestHour: parsed.data.digestHour }),
          ...(parsed.data.digestEnabled === undefined
            ? {}
            : { digestEnabled: parsed.data.digestEnabled }),
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!updated) return reply;
    return notificationPreferenceResponseSchema.parse({
      preferences: {
        timezone: updated.timezone,
        quietStartHour: updated.quietStartHour,
        quietEndHour: updated.quietEndHour,
        digestHour: updated.digestHour,
        digestEnabled: updated.digestEnabled,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  app.post("/api/v1/notifications/digest", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const database = request.server.database;
    if (!database) return reply;

    const created = await createDigest(database.db, user.id);
    return digestResponseSchema.parse({
      created: created !== null,
      notification: created
        ? notificationSchema.parse({
            id: created.id,
            title: created.title,
            body: created.body,
            channel: created.channel,
            status: created.status,
            scheduledAt: created.scheduledAt.toISOString(),
            sentAt: created.sentAt?.toISOString() ?? null,
            readAt: created.readAt?.toISOString() ?? null,
            createdAt: created.createdAt.toISOString(),
          })
        : null,
    });
  });
};
