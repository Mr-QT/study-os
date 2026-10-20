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

/* ------------------------------------------------------------------ */
/* Milestone 1.4 contracts: AI gateway                                 */
/* ------------------------------------------------------------------ */

export const aiPurposeSchema = z.enum(["study_plan", "explain"]);
export type AiPurpose = z.infer<typeof aiPurposeSchema>;

export const aiErrorCodes = {
  privacyDenied: "PRIVACY_DENIED",
  budgetExceeded: "BUDGET_EXCEEDED",
} as const;

export const aiStatusResponseSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().min(1),
  model: z.string().min(1),
  budgetUsd: z.number().nonnegative(),
  spentUsd: z.number().nonnegative(),
  remainingUsd: z.number().nonnegative(),
});
export type AiStatusResponse = z.infer<typeof aiStatusResponseSchema>;

export const aiRequestInputSchema = z.object({
  spaceId: z.string().uuid(),
  purpose: aiPurposeSchema,
  input: z.string().trim().min(1).max(4000),
});
export type AiRequestInput = z.infer<typeof aiRequestInputSchema>;

export const aiRequestResponseSchema = z.object({
  invocationId: z.string().min(1),
  text: z.string(),
  provider: z.string().min(1),
  model: z.string().min(1),
  usage: z.object({
    promptChars: z.number().int().nonnegative(),
    completionChars: z.number().int().nonnegative(),
  }),
});
export type AiRequestResponse = z.infer<typeof aiRequestResponseSchema>;

export const aiUsageResponseSchema = z.object({
  budgetUsd: z.number().nonnegative(),
  spentUsd: z.number().nonnegative(),
  calls: z.number().int().nonnegative(),
});
export type AiUsageResponse = z.infer<typeof aiUsageResponseSchema>;

/* ------------------------------------------------------------------ */
/* Milestone 1.5 contracts: sync and stats                             */
/* ------------------------------------------------------------------ */

export const syncEntityTypeSchema = z.enum(["task", "note"]);
export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>;

export const syncOperationSchema = z.object({
  opId: z.string().uuid(),
  entityType: syncEntityTypeSchema,
  entityId: z.string().uuid(),
  action: z.enum(["patch", "delete"]),
  patch: z.record(z.string(), z.unknown()).default({}),
  baseVersion: z.number().int().positive().optional(),
});
export type SyncOperation = z.infer<typeof syncOperationSchema>;

export const syncPushInputSchema = z.object({
  spaceId: z.string().uuid(),
  deviceId: z.string().max(100).optional(),
  operations: z.array(syncOperationSchema).min(1).max(100),
});
export type SyncPushInput = z.infer<typeof syncPushInputSchema>;

export const syncPushResultSchema = z.object({
  results: z.array(
    z.object({
      opId: z.string().min(1),
      status: z.enum(["accepted", "conflict", "rejected"]),
      version: z.number().int().optional(),
      reason: z.string().optional(),
    }),
  ),
});
export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncChangeSchema = z.object({
  cursor: z.number().int().nonnegative(),
  entityType: syncEntityTypeSchema,
  entityId: z.string().min(1),
  operation: z.string().min(1),
  version: z.number().int().nullable(),
  createdAt: z.string().min(1),
});
export type SyncChangeDto = z.infer<typeof syncChangeSchema>;

export const syncPullResponseSchema = z.object({
  changes: z.array(syncChangeSchema),
  nextCursor: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

export const statsResponseSchema = z.object({
  counts: z.object({
    spaces: z.number().int().nonnegative(),
    courses: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
    tasksDone: z.number().int().nonnegative(),
    notes: z.number().int().nonnegative(),
    files: z.number().int().nonnegative(),
    focusMinutes7d: z.number().int().nonnegative(),
  }),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;

/* ------------------------------------------------------------------ */
/* Milestone 2.1 contracts: question bank, wrong answers, review       */
/* ------------------------------------------------------------------ */

export const questionKindSchema = z.enum(["short_answer", "single_choice"]);
export type QuestionKind = z.infer<typeof questionKindSchema>;

export const questionSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  courseId: z.string().nullable(),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().nullable(),
  kind: questionKindSchema,
  options: z.array(z.string()).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type QuestionDto = z.infer<typeof questionSchema>;

export const createQuestionInputSchema = z.object({
  spaceId: z.string().uuid(),
  courseId: z.string().uuid().nullish(),
  prompt: z.string().trim().min(1).max(2000),
  answer: z.string().trim().min(1).max(2000),
  explanation: z.string().max(2000).nullish(),
  kind: questionKindSchema.optional(),
  options: z.array(z.string().max(500)).max(10).optional(),
});
export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

export const questionListResponseSchema = z.object({ questions: z.array(questionSchema) });
export const questionResponseSchema = z.object({ question: questionSchema });

export const attemptInputSchema = z.object({
  answer: z.string().trim().min(1).max(2000),
});
export type AttemptInput = z.infer<typeof attemptInputSchema>;

export const attemptResultSchema = z.object({
  attemptId: z.string().min(1),
  correct: z.boolean(),
  expectedAnswer: z.string().min(1),
  explanation: z.string().nullable(),
  intervalDays: z.number().int().positive(),
  nextDueAt: z.string().min(1),
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;

export const reviewQueueItemSchema = z.object({
  question: questionSchema,
  dueAt: z.string().min(1),
  intervalDays: z.number().int().positive(),
  repetitions: z.number().int().nonnegative(),
});
export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;

export const reviewQueueResponseSchema = z.object({ items: z.array(reviewQueueItemSchema) });
export const wrongAnswersResponseSchema = z.object({ questions: z.array(questionSchema) });
