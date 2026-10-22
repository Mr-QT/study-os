import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  createWebhookInputSchema,
  taskResponseSchema,
  webhookDeliveryListResponseSchema,
  webhookEndpointSecretResponseSchema,
  webhookTestResponseSchema,
} from "@study-os/contracts";
import { createDb, createPool } from "@study-os/db";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";
import { deliverDueWebhooks } from "../src/webhooks/dispatch";

const databaseUrl = process.env.DATABASE_URL;

interface CookieCarrier {
  cookies: Array<{ name: string; value: string }>;
}

function cookieHeader(response: CookieCarrier): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie) throw new Error("session cookie missing");
  return `${SESSION_COOKIE}=${cookie.value}`;
}

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  logLevel: "silent",
  corsOrigins: [],
  databaseUrl,
  sessionSecret: "test-session-secret",
  secureCookies: false,
  storageDir: "test-storage",
  version: "0.1.0",
};

describe.skipIf(!databaseUrl)("stage 6.3: outbound webhooks", () => {
  let app: FastifyInstance;
  let server: Server;
  let baseUrl = "";
  let cookie = "";
  let spaceId = "";
  let endpointId = "";
  let secret = "";
  const received: Array<{ event: string; timestamp: string; body: string; signature: string }> = [];

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        if (request.url === "/fail") {
          response.statusCode = 500;
          response.end("nope");
          return;
        }
        received.push({
          event: String(request.headers["x-studyos-event"] ?? ""),
          timestamp: String(request.headers["x-studyos-timestamp"] ?? ""),
          signature: String(request.headers["x-studyos-signature"] ?? ""),
          body,
        });
        response.statusCode = 200;
        response.end("ok");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    app = await buildApp(config, { logger: false });
    const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const body = authSessionResponseSchema.parse(guest.json());
    cookie = cookieHeader(guest);
    spaceId = body.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("creates an endpoint and signs a test delivery", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${spaceId}/webhooks`,
      headers: { cookie },
      payload: createWebhookInputSchema.parse({
        url: `${baseUrl}/hook`,
        events: ["task.completed", "ping"],
      }),
    });
    expect(created.statusCode).toBe(201);
    const body = webhookEndpointSecretResponseSchema.parse(created.json());
    endpointId = body.endpoint.id;
    secret = body.secret;

    const test = await app.inject({
      method: "POST",
      url: `/api/v1/webhooks/${endpointId}/test`,
      headers: { cookie },
    });
    expect(test.statusCode).toBe(200);
    expect(webhookTestResponseSchema.parse(test.json()).delivery?.status).toBe("success");

    const delivered = received.find((item) => item.event === "ping");
    expect(delivered).toBeDefined();
    const expected = createHmac("sha256", secret)
      .update(`${delivered?.timestamp}.${delivered?.body}`)
      .digest("hex");
    expect(delivered?.signature).toBe(`v1=${expected}`);
  });

  it("queues a delivery when a task completes and the worker sends it", async () => {
    const task = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie },
      payload: { spaceId, title: "Webhook 任务" },
    });
    const created = taskResponseSchema.parse(task.json()).task;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${created.id}`,
      headers: { cookie },
      payload: { status: "done", version: created.version },
    });

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/webhooks/${endpointId}/deliveries`,
      headers: { cookie },
    });
    const deliveries = webhookDeliveryListResponseSchema.parse(list.json()).deliveries;
    expect(deliveries.some((item) => item.event === "task.completed")).toBe(true);

    const pool = createPool(databaseUrl as string);
    const db = createDb(pool);
    const result = await deliverDueWebhooks(db);
    await pool.end();
    expect(result.delivered).toBeGreaterThanOrEqual(1);
    expect(received.some((item) => item.event === "task.completed")).toBe(true);
  });

  it("keeps a failed delivery pending for retry", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${spaceId}/webhooks`,
      headers: { cookie },
      payload: { url: `${baseUrl}/fail`, events: ["ping"] },
    });
    const endpoint = webhookEndpointSecretResponseSchema.parse(created.json()).endpoint;

    const test = await app.inject({
      method: "POST",
      url: `/api/v1/webhooks/${endpoint.id}/test`,
      headers: { cookie },
    });
    const delivery = webhookTestResponseSchema.parse(test.json()).delivery;
    expect(delivery?.status).toBe("pending");
    expect(delivery?.attempts).toBe(1);
    expect(delivery?.responseStatus).toBe(500);
  });
});
