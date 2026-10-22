import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authSessionResponseSchema,
  commentListResponseSchema,
  commentResponseSchema,
  joinInviteResponseSchema,
  memberListResponseSchema,
  spaceInviteListResponseSchema,
  spaceInviteResponseSchema,
  taskListResponseSchema,
  taskResponseSchema,
} from "@study-os/contracts";

import { buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/auth/session";
import type { ApiConfig } from "../src/config";

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

describe.skipIf(!databaseUrl)("stage 6: invites, roles and comments", () => {
  let app: FastifyInstance;
  let ownerCookie = "";
  let memberCookie = "";
  let spaceId = "";
  let memberId = "";
  let inviteToken = "";
  let commentId = "";

  beforeAll(async () => {
    app = await buildApp(config, { logger: false });
    const owner = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const ownerBody = authSessionResponseSchema.parse(owner.json());
    ownerCookie = cookieHeader(owner);
    spaceId = ownerBody.spaces[0]?.id ?? "";

    const member = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const memberBody = authSessionResponseSchema.parse(member.json());
    memberCookie = cookieHeader(member);
    memberId = memberBody.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an invite and lets a second user join as viewer", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${spaceId}/invites`,
      headers: { cookie: ownerCookie },
      payload: { role: "viewer", expiresInHours: 24, maxUses: 1 },
    });
    expect(created.statusCode).toBe(201);
    inviteToken = spaceInviteResponseSchema.parse(created.json()).invite.token;

    const joined = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${inviteToken}/join`,
      headers: { cookie: memberCookie },
    });
    expect(joined.statusCode).toBe(200);
    expect(joinInviteResponseSchema.parse(joined.json()).role).toBe("viewer");

    const members = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${spaceId}/members`,
      headers: { cookie: ownerCookie },
    });
    const list = memberListResponseSchema.parse(members.json()).members;
    expect(list).toHaveLength(2);
    expect(list.find((member) => member.userId === memberId)?.role).toBe("viewer");
  });

  it("blocks viewer writes and allows them after promotion", async () => {
    const blocked = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie: memberCookie },
      payload: { spaceId, title: "viewer 不能创建" },
    });
    expect(blocked.statusCode).toBe(403);

    const promoted = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${spaceId}/members/${memberId}`,
      headers: { cookie: ownerCookie },
      payload: { role: "editor" },
    });
    expect(promoted.statusCode).toBe(200);

    const allowed = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie: memberCookie },
      payload: { spaceId, title: "editor 可以创建" },
    });
    expect(allowed.statusCode).toBe(201);
  });

  it("lists invites for the owner and consumes the invite", async () => {
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${spaceId}/invites`,
      headers: { cookie: ownerCookie },
    });
    expect(spaceInviteListResponseSchema.parse(list.json()).invites).toHaveLength(1);

    const third = await app.inject({ method: "POST", url: "/api/v1/auth/guest" });
    const exhausted = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${inviteToken}/join`,
      headers: { cookie: cookieHeader(third) },
    });
    expect(exhausted.statusCode).toBe(410);
  });

  it("creates, lists and deletes space comments with permissions", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/comments",
      headers: { cookie: memberCookie },
      payload: { spaceId, entityType: "space", entityId: spaceId, body: "一起复习高数吧" },
    });
    expect(created.statusCode).toBe(201);
    commentId = commentResponseSchema.parse(created.json()).comment.id;

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/comments?spaceId=${spaceId}&entityType=space&entityId=${spaceId}`,
      headers: { cookie: ownerCookie },
    });
    expect(commentListResponseSchema.parse(list.json()).comments[0]?.authorName).toBeTruthy();

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}`,
      headers: { cookie: ownerCookie },
    });
    expect(removed.statusCode).toBe(204);

    const after = await app.inject({
      method: "GET",
      url: `/api/v1/comments?spaceId=${spaceId}`,
      headers: { cookie: ownerCookie },
    });
    expect(commentListResponseSchema.parse(after.json()).comments).toHaveLength(0);
  });

  it("assigns tasks to space members only", async () => {
    const assigned = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie: ownerCookie },
      payload: { spaceId, title: "分配给成员", assigneeId: memberId },
    });
    expect(assigned.statusCode).toBe(201);
    const task = taskResponseSchema.parse(assigned.json()).task;
    expect(task.assigneeId).toBe(memberId);

    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { cookie: ownerCookie },
      payload: {
        spaceId,
        title: "分配给非成员",
        assigneeId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(invalid.statusCode).toBe(400);

    const cleared = await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${task.id}`,
      headers: { cookie: ownerCookie },
      payload: { assigneeId: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect(taskResponseSchema.parse(cleared.json()).task.assigneeId).toBeNull();

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/tasks?spaceId=${spaceId}`,
      headers: { cookie: ownerCookie },
    });
    expect(taskListResponseSchema.parse(list.json()).tasks.some((item) => item.id === task.id)).toBe(
      true,
    );
  });

  it("hides invites from non-owners", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${spaceId}/invites`,
      headers: { cookie: memberCookie },
    });
    expect(response.statusCode).toBe(403);
  });
});
