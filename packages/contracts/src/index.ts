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

/* ------------------------------------------------------------------ */
/* Milestone 1.2 contracts: terms, courses, tasks, calendar events     */
/* ------------------------------------------------------------------ */

const isoDateTimeSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "需要 ISO 日期时间" });

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "需要 YYYY-MM-DD 格式的日期");

export const idParamSchema = z.object({ id: z.string().uuid() });
export const spaceQuerySchema = z.object({ spaceId: z.string().uuid() });

export const termSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  name: z.string().min(1),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type TermDto = z.infer<typeof termSchema>;

export const createTermInputSchema = z
  .object({
    spaceId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    startsOn: dateOnlySchema,
    endsOn: dateOnlySchema,
  })
  .refine((value) => value.startsOn <= value.endsOn, {
    message: "学期结束日期不能早于开始日期",
  });
export type CreateTermInput = z.infer<typeof createTermInputSchema>;

export const courseSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  termId: z.string().nullable(),
  name: z.string().min(1),
  code: z.string().nullable(),
  instructor: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type CourseDto = z.infer<typeof courseSchema>;

export const createCourseInputSchema = z.object({
  spaceId: z.string().uuid(),
  termId: z.string().uuid().nullish(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(40).nullish(),
  instructor: z.string().trim().max(120).nullish(),
});
export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const updateCourseInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    termId: z.string().uuid().nullable().optional(),
    code: z.string().trim().max(40).nullable().optional(),
    instructor: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });
export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

export const taskStatusSchema = z.enum(["todo", "in_progress", "done", "archived"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskQuerySchema = z.object({
  spaceId: z.string().uuid(),
  status: taskStatusSchema.optional(),
});

export const taskSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  courseId: z.string().nullable(),
  title: z.string().min(1),
  notes: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueAt: z.string().nullable(),
  estimateMinutes: z.number().int().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type TaskDto = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  spaceId: z.string().uuid(),
  courseId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(5000).nullish(),
  priority: taskPrioritySchema.optional(),
  dueAt: isoDateTimeSchema.nullish(),
  estimateMinutes: z.number().int().min(0).max(1440).nullish(),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().max(5000).nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    courseId: z.string().uuid().nullable().optional(),
    dueAt: isoDateTimeSchema.nullable().optional(),
    estimateMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    version: z.number().int().positive().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const calendarEventSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  title: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().min(1),
  sourceType: z.enum(["manual", "task", "course"]),
  sourceId: z.string().nullable(),
  locked: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type CalendarEventDto = z.infer<typeof calendarEventSchema>;

export const createCalendarEventInputSchema = z
  .object({
    spaceId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    timezone: z.string().trim().min(1).max(60).optional(),
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: "结束时间必须晚于开始时间",
  });
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventInputSchema>;

export const calendarEventQuerySchema = z.object({
  spaceId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const termListResponseSchema = z.object({ terms: z.array(termSchema) });
export const courseListResponseSchema = z.object({ courses: z.array(courseSchema) });
export const taskListResponseSchema = z.object({ tasks: z.array(taskSchema) });
export const calendarEventListResponseSchema = z.object({ events: z.array(calendarEventSchema) });

export const termResponseSchema = z.object({ term: termSchema });
export const courseResponseSchema = z.object({ course: courseSchema });
export const taskResponseSchema = z.object({ task: taskSchema });
export const calendarEventResponseSchema = z.object({ event: calendarEventSchema });

/* ------------------------------------------------------------------ */
/* Milestone 1.3 contracts: notes, focus sessions, files, learning log */
/* ------------------------------------------------------------------ */

export const noteSourceSchema = z.enum(["user", "ai"]);
export type NoteSource = z.infer<typeof noteSourceSchema>;

export const noteSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  courseId: z.string().nullable(),
  title: z.string().min(1),
  contentMd: z.string(),
  sourceType: noteSourceSchema,
  version: z.number().int().positive(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type NoteDto = z.infer<typeof noteSchema>;

export const createNoteInputSchema = z.object({
  spaceId: z.string().uuid(),
  courseId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(200),
  contentMd: z.string().max(50_000).optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;

export const updateNoteInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    contentMd: z.string().max(50_000).optional(),
    courseId: z.string().uuid().nullable().optional(),
    version: z.number().int().positive().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });
export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

export const noteListResponseSchema = z.object({ notes: z.array(noteSchema) });
export const noteResponseSchema = z.object({ note: noteSchema });

export const focusSessionSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  taskId: z.string().nullable(),
  startedAt: z.string().min(1),
  endedAt: z.string().nullable(),
  durationSeconds: z.number().int().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().min(1),
});
export type FocusSessionDto = z.infer<typeof focusSessionSchema>;

export const startFocusInputSchema = z.object({
  spaceId: z.string().uuid(),
  taskId: z.string().uuid().nullish(),
  startedAt: isoDateTimeSchema.optional(),
});
export type StartFocusInput = z.infer<typeof startFocusInputSchema>;

export const stopFocusInputSchema = z.object({
  endedAt: isoDateTimeSchema.optional(),
  note: z.string().max(2000).nullish(),
});
export type StopFocusInput = z.infer<typeof stopFocusInputSchema>;

export const focusSessionListResponseSchema = z.object({
  sessions: z.array(focusSessionSchema),
});
export const focusSessionResponseSchema = z.object({ session: focusSessionSchema });

export const fileAssetSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  noteId: z.string().nullable(),
  name: z.string().min(1),
  mime: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().min(1),
  createdAt: z.string().min(1),
});
export type FileAssetDto = z.infer<typeof fileAssetSchema>;

export const fileListResponseSchema = z.object({ files: z.array(fileAssetSchema) });
export const fileResponseSchema = z.object({ file: fileAssetSchema });

export const learningLogDaySchema = z.object({
  date: z.string().min(1),
  minutes: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
});
export type LearningLogDay = z.infer<typeof learningLogDaySchema>;

export const learningLogResponseSchema = z.object({
  days: z.array(learningLogDaySchema),
});
export type LearningLogResponse = z.infer<typeof learningLogResponseSchema>;
