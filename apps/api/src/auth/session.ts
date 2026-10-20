import type { FastifyReply, FastifyRequest } from "fastify";

export const SESSION_COOKIE = "studyos_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function setSession(reply: FastifyReply, userId: string, secure: boolean): void {
  reply.setCookie(SESSION_COOKIE, userId, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function readSession(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}
