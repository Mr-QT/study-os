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

/** Uniform error envelope (docs/API-CONTRACTS.md). */
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
  correlationId: z.string().min(1).optional(),
  retryable: z.boolean().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorCodes = {
  notFound: "NOT_FOUND",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  validation: "VALIDATION_ERROR",
  conflict: "CONFLICT",
  serviceUnavailable: "SERVICE_UNAVAILABLE",
  internal: "INTERNAL_ERROR",
} as const;

/* ------------------------------------------------------------------ */
/* Milestone 1.1 domain contracts: users and spaces                    */
/* ------------------------------------------------------------------ */

export const userKindSchema = z.enum(["guest", "account"]);
export type UserKind = z.infer<typeof userKindSchema>;

/** Public user shape returned by the API. */
export const userSchema = z.object({
  id: z.string().min(1),
  kind: userKindSchema,
  displayName: z.string().min(1),
  locale: z.string().min(2),
  timezone: z.string().min(1),
  createdAt: z.string().min(1),
});
export type UserDto = z.infer<typeof userSchema>;

export const spacePrivacySchema = z.enum(["shared", "personal", "private_local", "sensitive"]);
export type SpacePrivacy = z.infer<typeof spacePrivacySchema>;

export const spaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ownerId: z.string().min(1),
  parentId: z.string().nullable(),
  privacyLevel: spacePrivacySchema,
  syncPolicy: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type SpaceDto = z.infer<typeof spaceSchema>;

export const authSessionResponseSchema = z.object({
  user: userSchema,
  spaces: z.array(spaceSchema),
});
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

export const spaceListResponseSchema = z.object({
  spaces: z.array(spaceSchema),
});
export type SpaceListResponse = z.infer<typeof spaceListResponseSchema>;

export const spaceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const spaceResponseSchema = z.object({
  space: spaceSchema,
});
export type SpaceResponse = z.infer<typeof spaceResponseSchema>;

export const createSpaceInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().nullish(),
  privacyLevel: spacePrivacySchema.optional(),
});
export type CreateSpaceInput = z.infer<typeof createSpaceInputSchema>;

export const updateSpaceInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    privacyLevel: spacePrivacySchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.privacyLevel !== undefined, {
    message: "至少需要提供一个可更新字段",
  });
export type UpdateSpaceInput = z.infer<typeof updateSpaceInputSchema>;
