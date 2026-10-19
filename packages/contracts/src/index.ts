import { z } from "zod";

/** Stable service identifier returned by the API. */
export const API_SERVICE_NAME = "study-os-api" as const;

/** Result of an individual dependency check. */
export const checkStateSchema = z.enum(["ok", "degraded", "disabled", "error"]);
export type CheckState = z.infer<typeof checkStateSchema>;

export const healthChecksSchema = z.object({
  database: checkStateSchema,
});
export type HealthChecks = z.infer<typeof healthChecksSchema>;

/** `GET /health` — liveness plus dependency summary. Never fails when deps are down. */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal(API_SERVICE_NAME),
  version: z.string().min(1),
  uptimeSeconds: z.number().finite().nonnegative(),
  timestamp: z.string().min(1),
  checks: healthChecksSchema,
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** `GET /ready` — readiness; 503 when a required dependency is unavailable. */
export const readinessResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  service: z.literal(API_SERVICE_NAME),
  version: z.string().min(1),
  timestamp: z.string().min(1),
  checks: healthChecksSchema,
});
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

/** Uniform error envelope used by every API error response. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorCodes = {
  notFound: "NOT_FOUND",
  internal: "INTERNAL_ERROR",
  serviceUnavailable: "SERVICE_UNAVAILABLE",
} as const;
