import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authSessionResponseSchema, spaceResponseSchema } from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";

const databaseUrl = process.env.DATABASE_URL;

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

interface CookieCarrier {
  cookies: Array<{ name: string; value: string }>;
}

function sessionCookie(response: CookieCarrier): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  if (!cookie) throw new Error("session cookie missing");
  return `${SESSION_COOKIE}=${cookie.value}`;
}

describe.skipIf(!databaseUrl)("guest session and spaces", () => {
  let app: FastifyInstance;
  let cookieA = "";
  let cookieB = "";
  let userIdA = "";
  let defaultSpaceId = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });

    const guestA = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    expect(guestA.statusCode).toBe(200);
    const bodyA = authSessionResponseSchema.parse(guestA.json());
    cookieA = sessionCookie(guestA);
    userIdA = bodyA.user.id;
    defaultSpaceId = bodyA.spaces[0]?.id ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates one default space for a new guest", async () => {
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: cookieA },
    });
    expect(me.statusCode).toBe(200);
    const body = authSessionResponseSchema.parse(me.json());
    expect(body.user.id).toBe(userIdA);
    expect(body.user.kind).toBe("guest");
    expect(body.spaces.map((space) => space.id)).toContain(defaultSpaceId);
  });

  it("rejects unauthenticated space access", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/spaces" });
    expect(response.statusCode).toBe(401);
  });

  it("creates, lists and patches a space", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers: { cookie: cookieA },
      payload: { name: "高等数学" },
    });
    expect(created.statusCode).toBe(201);
    const space = spaceResponseSchema.parse(created.json()).space;
    expect(space.name).toBe("高等数学");
    expect(space.ownerId).toBe(userIdA);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/spaces",
      headers: { cookie: cookieA },
    });
    expect(list.statusCode).toBe(200);
    expect(
      (list.json() as { spaces: Array<{ id: string }> }).spaces.map((item) => item.id),
    ).toContain(space.id);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${space.id}`,
      headers: { cookie: cookieA },
      payload: { name: "高等数学（上）" },
    });
    expect(patched.statusCode).toBe(200);
    expect(spaceResponseSchema.parse(patched.json()).space.name).toBe("高等数学（上）");
  });

  it("validates input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers: { cookie: cookieA },
      payload: { name: "   " },
    });
    expect(response.statusCode).toBe(400);
  });

  it("hides other users' spaces (no IDOR)", async () => {
    const guestB = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    cookieB = sessionCookie(guestB);

    const read = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${defaultSpaceId}`,
      headers: { cookie: cookieB },
    });
    expect(read.statusCode).toBe(404);

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${defaultSpaceId}`,
      headers: { cookie: cookieB },
      payload: { name: "hijacked" },
    });
    expect(patch.statusCode).toBe(404);
  });
});
