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
  assigneeId: z.string().nullable(),
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
  assigneeId: z.string().uuid().nullish(),
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
    assigneeId: z.string().uuid().nullable().optional(),
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
  recurrence: z.enum(["none", "daily", "weekly"]),
  recurrenceUntil: z.string().nullable(),
  reminderMinutes: z.number().int().min(0).max(10080).nullable(),
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
    recurrence: z.enum(["none", "daily", "weekly"]).optional(),
    recurrenceUntil: isoDateTimeSchema.optional(),
    reminderMinutes: z.number().int().min(0).max(10080).optional(),
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: "结束时间必须晚于开始时间",
  })
  .refine(
    (value) =>
      !value.recurrenceUntil || Date.parse(value.recurrenceUntil) > Date.parse(value.startsAt),
    { message: "重复结束时间必须晚于开始时间" },
  );
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventInputSchema>;

export const updateCalendarEventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.optional(),
    timezone: z.string().trim().min(1).max(60).optional(),
    recurrence: z.enum(["none", "daily", "weekly"]).optional(),
    recurrenceUntil: isoDateTimeSchema.nullable().optional(),
    reminderMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventInputSchema>;

export const calendarOccurrenceSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().min(1),
  recurrence: z.enum(["none", "daily", "weekly"]),
  sourceType: z.enum(["manual", "task", "course"]),
});
export type CalendarOccurrence = z.infer<typeof calendarOccurrenceSchema>;

export const calendarEventQuerySchema = z.object({
  spaceId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const termListResponseSchema = z.object({ terms: z.array(termSchema) });
export const courseListResponseSchema = z.object({ courses: z.array(courseSchema) });
export const taskListResponseSchema = z.object({ tasks: z.array(taskSchema) });
export const calendarEventListResponseSchema = z.object({ events: z.array(calendarEventSchema) });
export const calendarOccurrenceListResponseSchema = z.object({
  occurrences: z.array(calendarOccurrenceSchema),
});

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

/* ------------------------------------------------------------------ */
/* Stage 2 remainder: exams, grades, mastery, search, PDF annotations  */
/* ------------------------------------------------------------------ */

export const examStatusSchema = z.enum(["planned", "completed"]);

export const examSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  courseId: z.string().nullable(),
  title: z.string().min(1),
  scheduledAt: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  status: examStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type ExamDto = z.infer<typeof examSchema>;

export const examPublicQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  kind: questionKindSchema,
  options: z.array(z.string()).nullable(),
  points: z.number().int().positive(),
});

export const createExamInputSchema = z.object({
  spaceId: z.string().uuid(),
  courseId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(200),
  questionIds: z.array(z.string().uuid()).min(1).max(50),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
});
export type CreateExamInput = z.infer<typeof createExamInputSchema>;

export const examListResponseSchema = z.object({ exams: z.array(examSchema) });
export const examDetailResponseSchema = z.object({
  exam: examSchema,
  questions: z.array(examPublicQuestionSchema),
});

export const examAttemptSchema = z.object({
  id: z.string().min(1),
  examId: z.string().min(1),
  startedAt: z.string().min(1),
  submittedAt: z.string().nullable(),
  score: z.number().int().nullable(),
  maxScore: z.number().int().nonnegative(),
});

export const startExamAttemptResponseSchema = z.object({
  attempt: examAttemptSchema,
  exam: examSchema,
  questions: z.array(examPublicQuestionSchema),
});

export const submitExamAttemptInputSchema = z.object({
  answers: z.record(z.string(), z.string()),
});
export type SubmitExamAttemptInput = z.infer<typeof submitExamAttemptInputSchema>;

export const submitExamAttemptResponseSchema = z.object({
  attempt: examAttemptSchema,
  percentage: z.number().nonnegative(),
  results: z.array(
    z.object({
      questionId: z.string().min(1),
      correct: z.boolean(),
      expectedAnswer: z.string().min(1),
      points: z.number().int().positive(),
    }),
  ),
});

export const gradeEntrySchema = z.object({
  examId: z.string().min(1),
  examTitle: z.string().min(1),
  score: z.number().int().nonnegative(),
  maxScore: z.number().int().positive(),
  percentage: z.number().nonnegative(),
  submittedAt: z.string().min(1),
});
export type GradeEntry = z.infer<typeof gradeEntrySchema>;

export const gradesResponseSchema = z.object({
  grades: z.array(gradeEntrySchema),
  averagePercentage: z.number().nonnegative(),
});

export const masteryItemSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  accuracy: z.number().nonnegative(),
});
export const masteryResponseSchema = z.object({ items: z.array(masteryItemSchema) });

export const searchResponseSchema = z.object({
  notes: z.array(z.object({ id: z.string().min(1), title: z.string().min(1) })),
  questions: z.array(z.object({ id: z.string().min(1), prompt: z.string().min(1) })),
});

export const pdfAnnotationSchema = z.object({
  id: z.string().min(1),
  fileId: z.string().min(1),
  page: z.number().int().positive(),
  rect: z.string().nullable(),
  note: z.string().nullable(),
  color: z.string().min(1),
  createdAt: z.string().min(1),
});
export const createPdfAnnotationInputSchema = z.object({
  spaceId: z.string().uuid(),
  fileId: z.string().uuid(),
  page: z.number().int().min(1).max(5000),
  rect: z.string().max(500).nullish(),
  note: z.string().max(2000).nullish(),
  color: z.string().max(30).optional(),
});
export const pdfAnnotationListResponseSchema = z.object({
  annotations: z.array(pdfAnnotationSchema),
});

export const semanticSearchResultSchema = z.object({
  sourceType: z.enum(["note", "question"]),
  sourceId: z.string().min(1),
  title: z.string().min(1),
  snippet: z.string(),
  score: z.number(),
});
export type SemanticSearchResult = z.infer<typeof semanticSearchResultSchema>;

export const semanticSearchResponseSchema = z.object({
  results: z.array(semanticSearchResultSchema),
});

export const ragReindexResponseSchema = z.object({
  notes: z.number().int().nonnegative(),
  questions: z.number().int().nonnegative(),
  chunks: z.number().int().nonnegative(),
});

/* ------------------------------------------------------------------ */
/* Stage 3: AI memory, analytics/risk and tutor                        */
/* ------------------------------------------------------------------ */

export const memoryScopeSchema = z.enum(["user", "space", "course"]);
export const memoryKindSchema = z.enum(["fact", "preference", "inference"]);

export const memorySchema = z.object({
  id: z.string().min(1),
  scope: memoryScopeSchema,
  kind: memoryKindSchema,
  content: z.string().min(1),
  source: z.string().min(1),
  confidence: z.number().int().min(0).max(100),
  pinned: z.boolean(),
  disabled: z.boolean(),
  expiresAt: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type MemoryDto = z.infer<typeof memorySchema>;

export const createMemoryInputSchema = z.object({
  spaceId: z.string().uuid().nullish(),
  courseId: z.string().uuid().nullish(),
  scope: memoryScopeSchema.optional(),
  kind: memoryKindSchema.optional(),
  content: z.string().trim().min(1).max(1000),
  confidence: z.number().int().min(0).max(100).optional(),
  expiresAt: z.string().optional(),
  pinned: z.boolean().optional(),
});
export type CreateMemoryInput = z.infer<typeof createMemoryInputSchema>;

export const updateMemoryInputSchema = z
  .object({
    content: z.string().trim().min(1).max(1000).optional(),
    kind: memoryKindSchema.optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    pinned: z.boolean().optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });
export type UpdateMemoryInput = z.infer<typeof updateMemoryInputSchema>;

export const memoryListResponseSchema = z.object({ memories: z.array(memorySchema) });
export const memoryResponseSchema = z.object({ memory: memorySchema });

export const analyticsOverviewSchema = z.object({
  tasks: z.object({
    total: z.number().int().nonnegative(),
    done: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
  }),
  focus: z.object({
    minutes7d: z.number().int().nonnegative(),
    minutesPrev7d: z.number().int().nonnegative(),
  }),
  exams: z.object({
    attempts: z.number().int().nonnegative(),
    averagePercentage: z.number().nonnegative(),
  }),
  weakQuestions: z.array(
    z.object({
      questionId: z.string().min(1),
      prompt: z.string().min(1),
      accuracy: z.number().nonnegative(),
    }),
  ),
  risks: z.array(z.string()),
  riskScore: z.number().min(0).max(100),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

export const tutorInputSchema = z.object({
  spaceId: z.string().uuid(),
  question: z.string().trim().min(1).max(3000),
  mode: z.enum(["socratic", "explain"]).optional(),
});
export type TutorInput = z.infer<typeof tutorInputSchema>;

export const tutorResponseSchema = z.object({
  invocationId: z.string().min(1),
  text: z.string(),
  provider: z.string().min(1),
  model: z.string().min(1),
  memoriesUsed: z.number().int().nonnegative(),
  weakQuestionsUsed: z.number().int().nonnegative(),
});
export type TutorResponse = z.infer<typeof tutorResponseSchema>;

/* ------------------------------------------------------------------ */
/* Stage 3.2: agents, learning plans, memory extraction                */
/* ------------------------------------------------------------------ */

export const agentRoleSchema = z.enum(["planner", "tutor", "examiner", "analyst"]);
export type AgentRole = z.infer<typeof agentRoleSchema>;

export const agentListResponseSchema = z.object({
  agents: z.array(
    z.object({
      role: agentRoleSchema,
      description: z.string().min(1),
    }),
  ),
});

export const agentRunInputSchema = z.object({
  spaceId: z.string().uuid(),
  input: z.string().trim().min(1).max(3000),
});
export type AgentRunInput = z.infer<typeof agentRunInputSchema>;

export const agentRunResponseSchema = z.object({
  invocationId: z.string().min(1),
  role: agentRoleSchema,
  text: z.string(),
  provider: z.string().min(1),
  model: z.string().min(1),
});

export const planStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["diagnose", "study", "practice", "review"]),
  status: z.enum(["pending", "in_progress", "done"]),
});
export type PlanStep = z.infer<typeof planStepSchema>;

export const learningPlanSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  courseId: z.string().nullable(),
  goal: z.string().min(1),
  status: z.enum(["active", "completed", "archived"]),
  steps: z.array(planStepSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type LearningPlanDto = z.infer<typeof learningPlanSchema>;

export const createLearningPlanInputSchema = z.object({
  spaceId: z.string().uuid(),
  courseId: z.string().uuid().nullish(),
  goal: z.string().trim().min(1).max(1000),
});
export type CreateLearningPlanInput = z.infer<typeof createLearningPlanInputSchema>;

export const updatePlanStepInputSchema = z.object({
  stepId: z.string().min(1),
  status: z.enum(["pending", "in_progress", "done"]),
});

export const planListResponseSchema = z.object({ plans: z.array(learningPlanSchema) });
export const planResponseSchema = z.object({ plan: learningPlanSchema });

export const extractMemoriesInputSchema = z.object({
  spaceId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
});
export const extractMemoriesResponseSchema = z.object({
  memories: z.array(memorySchema),
});

/* ------------------------------------------------------------------ */
/* Stage 4: automation rules and notifications                         */
/* ------------------------------------------------------------------ */

export const automationTriggerSchema = z.enum([
  "task.completed",
  "focus.completed",
  "exam.submitted",
]);
export type AutomationTrigger = z.infer<typeof automationTriggerSchema>;

export const automationActionSchema = z.object({
  type: z.enum(["create_notification", "create_task"]),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(1000).optional(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  delayMinutes: z.number().int().min(0).max(10080).optional(),
  dedupeKey: z.string().trim().max(120).optional(),
});
export type AutomationAction = z.infer<typeof automationActionSchema>;

export const automationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trigger: automationTriggerSchema,
  conditions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  actions: z.array(automationActionSchema),
  enabled: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type AutomationRuleDto = z.infer<typeof automationRuleSchema>;

export const createAutomationRuleInputSchema = z.object({
  spaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  trigger: automationTriggerSchema,
  conditions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  actions: z.array(automationActionSchema).min(1).max(5),
  enabled: z.boolean().optional(),
});
export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleInputSchema>;

export const updateAutomationRuleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    conditions: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    actions: z.array(automationActionSchema).min(1).max(5).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });

export const automationRuleListResponseSchema = z.object({
  rules: z.array(automationRuleSchema),
});
export const automationRuleResponseSchema = z.object({ rule: automationRuleSchema });

export const automationRunSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  trigger: automationTriggerSchema,
  status: z.enum(["ok", "error", "skipped"]),
  message: z.string().nullable(),
  createdAt: z.string().min(1),
});
export const automationRunListResponseSchema = z.object({
  runs: z.array(automationRunSchema),
});
export type AutomationRunDto = z.infer<typeof automationRunSchema>;

export const dryRunInputSchema = z.object({
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export const dryRunResponseSchema = z.object({
  matched: z.boolean(),
  actions: z.array(automationActionSchema),
});

export const notificationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().nullable(),
  channel: z.enum(["in_app", "email", "pwa"]),
  status: z.enum(["pending", "sent", "failed", "read"]),
  scheduledAt: z.string().min(1),
  sentAt: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string().min(1),
});
export type NotificationDto = z.infer<typeof notificationSchema>;

export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  unread: z.number().int().nonnegative(),
});

export const dispatchResponseSchema = z.object({
  sent: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const notificationPreferenceSchema = z.object({
  timezone: z.string().min(1),
  quietStartHour: z.number().int().min(0).max(23),
  quietEndHour: z.number().int().min(0).max(23),
  digestHour: z.number().int().min(0).max(23),
  digestEnabled: z.boolean(),
  updatedAt: z.string().min(1),
});
export type NotificationPreferenceDto = z.infer<typeof notificationPreferenceSchema>;

export const updateNotificationPreferenceInputSchema = z
  .object({
    timezone: z.string().trim().min(1).max(60).optional(),
    quietStartHour: z.number().int().min(0).max(23).optional(),
    quietEndHour: z.number().int().min(0).max(23).optional(),
    digestHour: z.number().int().min(0).max(23).optional(),
    digestEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });

export const notificationPreferenceResponseSchema = z.object({
  preferences: notificationPreferenceSchema,
});

export const digestResponseSchema = z.object({
  created: z.boolean(),
  notification: notificationSchema.nullable(),
});

/* ------------------------------------------------------------------ */
/* Stage 5: growth goals, habits, achievements and portfolio export    */
/* ------------------------------------------------------------------ */

export const goalMetricSchema = z.enum([
  "focus_minutes",
  "tasks_done",
  "questions_answered",
  "exams_completed",
]);
export type GoalMetric = z.infer<typeof goalMetricSchema>;

export const goalStatusSchema = z.enum(["active", "completed", "archived"]);

export const learningGoalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  metric: goalMetricSchema,
  targetValue: z.number().int().positive(),
  currentValue: z.number().nonnegative(),
  progressPercent: z.number().min(0).max(100),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  status: goalStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type LearningGoalDto = z.infer<typeof learningGoalSchema>;

export const createGoalInputSchema = z
  .object({
    spaceId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    metric: goalMetricSchema,
    targetValue: z.number().int().min(1).max(1_000_000),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: "结束时间必须晚于开始时间",
  });
export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

export const updateGoalInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    targetValue: z.number().int().min(1).max(1_000_000).optional(),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.optional(),
    status: goalStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });

export const goalListResponseSchema = z.object({ goals: z.array(learningGoalSchema) });
export const goalResponseSchema = z.object({ goal: learningGoalSchema });

export const habitCadenceSchema = z.enum(["daily", "weekly"]);

export const habitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  cadence: habitCadenceSchema,
  targetPerPeriod: z.number().int().positive(),
  active: z.boolean(),
  todayCount: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
});
export type HabitDto = z.infer<typeof habitSchema>;

export const createHabitInputSchema = z.object({
  spaceId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  cadence: habitCadenceSchema.optional(),
  targetPerPeriod: z.number().int().min(1).max(50).optional(),
});
export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;

export const updateHabitInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    cadence: habitCadenceSchema.optional(),
    targetPerPeriod: z.number().int().min(1).max(50).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "至少需要一个字段" });

export const habitListResponseSchema = z.object({ habits: z.array(habitSchema) });
export const habitResponseSchema = z.object({ habit: habitSchema });

export const habitCheckinInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const achievementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  earned: z.boolean(),
  detail: z.string(),
});

export const profileSummarySchema = z.object({
  totals: z.object({
    focusMinutes: z.number().int().nonnegative(),
    tasksDone: z.number().int().nonnegative(),
    questionsAnswered: z.number().int().nonnegative(),
    examsCompleted: z.number().int().nonnegative(),
  }),
  goals: z.array(learningGoalSchema),
  habits: z.array(habitSchema),
  achievements: z.array(achievementSchema),
  generatedAt: z.string().min(1),
});
export type ProfileSummary = z.infer<typeof profileSummarySchema>;

export const profileExportResponseSchema = z.object({
  markdown: z.string().min(1),
  generatedAt: z.string().min(1),
});

/* ------------------------------------------------------------------ */
/* Stage 5.2: import center                                            */
/* ------------------------------------------------------------------ */

export const importKindSchema = z.enum(["tasks", "questions"]);
export type ImportKind = z.infer<typeof importKindSchema>;

export const importStatusSchema = z.enum(["previewed", "committed", "rolled_back"]);

export const importBatchSchema = z.object({
  id: z.string().min(1),
  kind: importKindSchema,
  filename: z.string().min(1),
  status: importStatusSchema,
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  sha256: z.string().min(1),
  createdAt: z.string().min(1),
  committedAt: z.string().nullable(),
  rolledBackAt: z.string().nullable(),
});
export type ImportBatchDto = z.infer<typeof importBatchSchema>;

export const importPreviewInputSchema = z.object({
  spaceId: z.string().uuid(),
  kind: importKindSchema,
  csv: z.string().min(1).max(1_000_000),
  filename: z.string().trim().min(1).max(200).optional(),
});

export const importRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  values: z.record(z.string(), z.string()),
  valid: z.boolean(),
  error: z.string().nullable(),
});
export type ImportRowPreview = z.infer<typeof importRowSchema>;

export const importPreviewResponseSchema = z.object({
  batch: importBatchSchema,
  rows: z.array(importRowSchema),
});

export const importCommitResponseSchema = z.object({
  batch: importBatchSchema,
  created: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

export const importRollbackResponseSchema = z.object({
  batch: importBatchSchema,
  deleted: z.number().int().nonnegative(),
});

export const importBatchListResponseSchema = z.object({
  batches: z.array(importBatchSchema),
});

export const ruleDraftInputSchema = z.object({
  spaceId: z.string().uuid(),
  text: z.string().trim().min(1).max(1000),
});
export const ruleDraftResponseSchema = z.object({
  name: z.string().min(1),
  trigger: automationTriggerSchema,
  conditions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  actions: z.array(automationActionSchema).min(1).max(5),
});
export type RuleDraft = z.infer<typeof ruleDraftResponseSchema>;

/* ------------------------------------------------------------------ */
/* Stage 5.3: local multimodal (OCR / speech)                          */
/* ------------------------------------------------------------------ */

export const mediaTextResponseSchema = z.object({
  kind: z.enum(["ocr", "transcribe"]),
  text: z.string(),
  model: z.string().min(1),
});
export type MediaTextResponse = z.infer<typeof mediaTextResponseSchema>;

/* ------------------------------------------------------------------ */
/* Stage 6: lightweight collaboration                                  */
/* ------------------------------------------------------------------ */

export const inviteRoleSchema = z.enum(["editor", "viewer"]);
export const memberRoleSchema = z.enum(["owner", "editor", "viewer"]);

export const spaceInviteSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  token: z.string().min(1),
  role: inviteRoleSchema,
  expiresAt: z.string().min(1),
  maxUses: z.number().int().positive(),
  uses: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
});
export type SpaceInviteDto = z.infer<typeof spaceInviteSchema>;

export const createInviteInputSchema = z.object({
  role: inviteRoleSchema,
  expiresInHours: z.number().int().min(1).max(720).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
});

export const spaceInviteListResponseSchema = z.object({
  invites: z.array(spaceInviteSchema),
});
export const spaceInviteResponseSchema = z.object({ invite: spaceInviteSchema });

export const memberSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  role: memberRoleSchema,
  createdAt: z.string().min(1),
});
export type MemberDto = z.infer<typeof memberSchema>;
export const memberListResponseSchema = z.object({ members: z.array(memberSchema) });

export const updateMemberRoleInputSchema = z.object({ role: inviteRoleSchema });

export const joinInviteResponseSchema = z.object({
  spaceId: z.string().min(1),
  role: memberRoleSchema,
});

export const commentEntitySchema = z.enum(["space", "task", "note", "question", "exam"]);

export const commentSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  entityType: commentEntitySchema,
  entityId: z.string().min(1),
  userId: z.string().min(1),
  authorName: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.string().min(1),
});
export type CommentDto = z.infer<typeof commentSchema>;

export const createCommentInputSchema = z.object({
  spaceId: z.string().uuid(),
  entityType: commentEntitySchema.optional(),
  entityId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const commentQuerySchema = z.object({
  spaceId: z.string().uuid(),
  entityType: commentEntitySchema.optional(),
  entityId: z.string().uuid().optional(),
});

export const commentListResponseSchema = z.object({ comments: z.array(commentSchema) });
export const commentResponseSchema = z.object({ comment: commentSchema });
