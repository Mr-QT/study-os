import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Guest users exist without an account; accounts are added in a later milestone. */
export const userKindEnum = pgEnum("user_kind", ["guest", "account"]);

/** Privacy levels follow docs/SECURITY-PRIVACY.md. */
export const spacePrivacyEnum = pgEnum("space_privacy", [
  "shared",
  "personal",
  "private_local",
  "sensitive",
]);

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "editor", "viewer"]);

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done", "archived"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const calendarSourceEnum = pgEnum("calendar_source", ["manual", "task", "course"]);
export const recurrenceEnum = pgEnum("calendar_recurrence", ["none", "daily", "weekly"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: userKindEnum("kind").notNull().default("guest"),
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("zh-CN"),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Hierarchy is validated at the application layer to keep this milestone small;
    // the FK to spaces.id is added with the hierarchy milestone.
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    privacyLevel: spacePrivacyEnum("privacy_level").notNull().default("personal"),
    syncPolicy: text("sync_policy").notNull().default("synced"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("spaces_owner_idx").on(table.ownerId)],
);

export const memberships = pgTable(
  "memberships",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("viewer"),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    index("memberships_user_idx").on(table.userId),
  ],
);

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("terms_space_idx").on(table.spaceId)],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    termId: uuid("term_id").references(() => terms.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    code: text("code"),
    instructor: text("instructor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("courses_space_idx").on(table.spaceId),
    index("courses_term_idx").on(table.termId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    notes: text("notes"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    estimateMinutes: integer("estimate_minutes"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_space_idx").on(table.spaceId),
    index("tasks_course_idx").on(table.courseId),
    index("tasks_assignee_idx").on(table.assigneeId),
    index("tasks_due_idx").on(table.dueAt),
  ],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("Asia/Shanghai"),
    sourceType: calendarSourceEnum("source_type").notNull().default("manual"),
    sourceId: uuid("source_id"),
    locked: boolean("locked").notNull().default(false),
    recurrence: recurrenceEnum("recurrence").notNull().default("none"),
    recurrenceUntil: timestamp("recurrence_until", { withTimezone: true }),
    reminderMinutes: integer("reminder_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("events_space_idx").on(table.spaceId),
    index("events_starts_idx").on(table.startsAt),
  ],
);

export const noteSourceEnum = pgEnum("note_source", ["user", "ai"]);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    contentMd: text("content_md").notNull().default(""),
    sourceType: noteSourceEnum("source_type").notNull().default("user"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("notes_space_idx").on(table.spaceId),
    index("notes_course_idx").on(table.courseId),
  ],
);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("focus_space_idx").on(table.spaceId),
    index("focus_user_idx").on(table.userId),
    index("focus_started_idx").on(table.startedAt),
  ],
);

export const fileAssets = pgTable(
  "file_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("files_space_idx").on(table.spaceId),
    index("files_sha_idx").on(table.sha256),
  ],
);

export const aiInvocationStatusEnum = pgEnum("ai_invocation_status", ["ok", "error", "blocked"]);

export const aiInvocations = pgTable(
  "ai_invocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptChars: integer("prompt_chars").notNull().default(0),
    completionChars: integer("completion_chars").notNull().default(0),
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
    status: aiInvocationStatusEnum("status").notNull().default("ok"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_invocations_user_idx").on(table.userId),
    index("ai_invocations_space_idx").on(table.spaceId),
    index("ai_invocations_created_idx").on(table.createdAt),
  ],
);

/** Append-only change log used by the incremental sync protocol. */
export const syncChanges = pgTable(
  "sync_changes",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    operation: text("operation").notNull(),
    version: integer("version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sync_changes_space_idx").on(table.spaceId, table.id),
    index("sync_changes_user_idx").on(table.userId),
  ],
);

export const questionKindEnum = pgEnum("question_kind", ["short_answer", "single_choice"]);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    prompt: text("prompt").notNull(),
    answer: text("answer").notNull(),
    explanation: text("explanation"),
    kind: questionKindEnum("kind").notNull().default("short_answer"),
    options: text("options"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("questions_space_idx").on(table.spaceId),
    index("questions_course_idx").on(table.courseId),
  ],
);

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answer: text("answer").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("attempts_question_idx").on(table.questionId),
    index("attempts_user_idx").on(table.userId),
  ],
);

export const reviewItems = pgTable(
  "review_items",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    intervalDays: integer("interval_days").notNull().default(1),
    ease: integer("ease").notNull().default(250),
    repetitions: integer("repetitions").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.questionId, table.userId] }),
    index("review_due_idx").on(table.dueAt),
  ],
);

export const examStatusEnum = pgEnum("exam_status", ["planned", "completed"]);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    status: examStatusEnum("status").notNull().default("planned"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("exams_space_idx").on(table.spaceId)],
);

export const examQuestions = pgTable(
  "exam_questions",
  {
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    points: integer("points").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.examId, table.questionId] }),
    index("exam_questions_exam_idx").on(table.examId),
  ],
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    score: integer("score"),
    maxScore: integer("max_score").notNull().default(0),
    answers: text("answers"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exam_attempts_exam_idx").on(table.examId),
    index("exam_attempts_user_idx").on(table.userId),
  ],
);

export const pdfAnnotations = pgTable(
  "pdf_annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => fileAssets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    page: integer("page").notNull(),
    rect: text("rect"),
    note: text("note"),
    color: text("color").notNull().default("#F5D7CE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pdf_annotations_space_idx").on(table.spaceId),
    index("pdf_annotations_file_idx").on(table.fileId),
  ],
);

export const ragSourceEnum = pgEnum("rag_source", ["note", "question"]);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    sourceType: ragSourceEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chunks_space_idx").on(table.spaceId),
    index("chunks_source_idx").on(table.sourceType, table.sourceId),
  ],
);

export const memoryScopeEnum = pgEnum("memory_scope", ["user", "space", "course"]);
export const memoryKindEnum = pgEnum("memory_kind", ["fact", "preference", "inference"]);

export const aiMemories = pgTable(
  "ai_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    scope: memoryScopeEnum("scope").notNull().default("user"),
    kind: memoryKindEnum("kind").notNull().default("fact"),
    content: text("content").notNull(),
    source: text("source").notNull().default("user"),
    confidence: integer("confidence").notNull().default(80),
    pinned: boolean("pinned").notNull().default(false),
    disabled: boolean("disabled").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("memories_user_idx").on(table.userId),
    index("memories_space_idx").on(table.spaceId),
  ],
);

export const planStatusEnum = pgEnum("plan_status", ["active", "completed", "archived"]);

export const learningPlans = pgTable(
  "learning_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goal: text("goal").notNull(),
    status: planStatusEnum("status").notNull().default("active"),
    steps: text("steps").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("plans_space_idx").on(table.spaceId),
    index("plans_user_idx").on(table.userId),
  ],
);

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "task.completed",
  "focus.completed",
  "exam.submitted",
]);
export const automationRunStatusEnum = pgEnum("automation_run_status", ["ok", "error", "skipped"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "email", "pwa"]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "read",
]);

export const automationRules = pgTable(
  "automation_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    trigger: automationTriggerEnum("trigger").notNull(),
    conditions: text("conditions").notNull().default("{}"),
    actions: text("actions").notNull().default("[]"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rules_space_idx").on(table.spaceId),
    index("rules_trigger_idx").on(table.trigger),
  ],
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => automationRules.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trigger: automationTriggerEnum("trigger").notNull(),
    status: automationRunStatusEnum("status").notNull().default("ok"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("runs_rule_idx").on(table.ruleId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    status: notificationStatusEnum("status").notNull().default("pending"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_status_idx").on(table.status),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  quietStartHour: integer("quiet_start_hour").notNull().default(22),
  quietEndHour: integer("quiet_end_hour").notNull().default(8),
  digestHour: integer("digest_hour").notNull().default(20),
  digestEnabled: boolean("digest_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalMetricEnum = pgEnum("goal_metric", [
  "focus_minutes",
  "tasks_done",
  "questions_answered",
  "exams_completed",
]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "archived"]);
export const habitCadenceEnum = pgEnum("habit_cadence", ["daily", "weekly"]);

export const learningGoals = pgTable(
  "learning_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    metric: goalMetricEnum("metric").notNull(),
    targetValue: integer("target_value").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: goalStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("goals_space_idx").on(table.spaceId),
    index("goals_user_idx").on(table.userId),
  ],
);

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    cadence: habitCadenceEnum("cadence").notNull().default("daily"),
    targetPerPeriod: integer("target_per_period").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("habits_space_idx").on(table.spaceId)],
);

export const habitCheckins = pgTable(
  "habit_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkinDate: date("checkin_date").notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("habit_checkin_unique").on(table.habitId, table.checkinDate)],
);

export const importKindEnum = pgEnum("import_kind", ["tasks", "questions"]);
export const importStatusEnum = pgEnum("import_status", [
  "previewed",
  "committed",
  "rolled_back",
]);
export const importItemStatusEnum = pgEnum("import_item_status", [
  "pending",
  "created",
  "skipped",
  "failed",
]);

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: importKindEnum("kind").notNull(),
    filename: text("filename").notNull(),
    status: importStatusEnum("status").notNull().default("previewed"),
    rawCsv: text("raw_csv").notNull(),
    sha256: text("sha256").notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    invalidRows: integer("invalid_rows").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  },
  (table) => [index("import_batches_space_idx").on(table.spaceId)],
);

export const importItems = pgTable(
  "import_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    status: importItemStatusEnum("status").notNull().default("pending"),
    entityId: uuid("entity_id"),
    payload: text("payload").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("import_items_batch_idx").on(table.batchId)],
);

export const commentEntityEnum = pgEnum("comment_entity", [
  "space",
  "task",
  "note",
  "question",
  "exam",
]);

export const spaceInvites = pgTable(
  "space_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    role: membershipRoleEnum("role").notNull().default("viewer"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    maxUses: integer("max_uses").notNull().default(1),
    uses: integer("uses").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("space_invites_token_unique").on(table.token),
    index("space_invites_space_idx").on(table.spaceId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    entityType: commentEntityEnum("entity_type").notNull().default("space"),
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("comments_space_idx").on(table.spaceId),
    index("comments_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const webhookStatusEnum = pgEnum("webhook_status", ["pending", "success", "failed"]);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: text("events").notNull().default("[]"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("webhook_endpoints_space_idx").on(table.spaceId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: text("payload").notNull(),
    status: webhookStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    responseStatus: integer("response_status"),
    error: text("error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("webhook_deliveries_endpoint_idx").on(table.endpointId),
    index("webhook_deliveries_status_idx").on(table.status, table.nextAttemptAt),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SpaceRow = typeof spaces.$inferSelect;
export type NewSpaceRow = typeof spaces.$inferInsert;
export type MembershipRow = typeof memberships.$inferSelect;
export type TermRow = typeof terms.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type CalendarEventRow = typeof calendarEvents.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type FocusSessionRow = typeof focusSessions.$inferSelect;
export type FileAssetRow = typeof fileAssets.$inferSelect;
export type AiInvocationRow = typeof aiInvocations.$inferSelect;
export type SyncChangeRow = typeof syncChanges.$inferSelect;
export type QuestionRow = typeof questions.$inferSelect;
export type QuestionAttemptRow = typeof questionAttempts.$inferSelect;
export type ReviewItemRow = typeof reviewItems.$inferSelect;
export type ExamRow = typeof exams.$inferSelect;
export type ExamQuestionRow = typeof examQuestions.$inferSelect;
export type ExamAttemptRow = typeof examAttempts.$inferSelect;
export type PdfAnnotationRow = typeof pdfAnnotations.$inferSelect;
export type KnowledgeChunkRow = typeof knowledgeChunks.$inferSelect;
export type AiMemoryRow = typeof aiMemories.$inferSelect;
export type LearningPlanRow = typeof learningPlans.$inferSelect;
export type AutomationRuleRow = typeof automationRules.$inferSelect;
export type AutomationRunRow = typeof automationRuns.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;
export type LearningGoalRow = typeof learningGoals.$inferSelect;
export type HabitRow = typeof habits.$inferSelect;
export type HabitCheckinRow = typeof habitCheckins.$inferSelect;
export type ImportBatchRow = typeof importBatches.$inferSelect;
export type ImportItemRow = typeof importItems.$inferSelect;
export type SpaceInviteRow = typeof spaceInvites.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
