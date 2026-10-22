export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

export const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;
export const AUTH_GUEST_ENDPOINT = `${API_BASE_URL}/api/v1/auth/guest`;
export const SPACES_ENDPOINT = `${API_BASE_URL}/api/v1/spaces`;
export const COURSES_ENDPOINT = `${API_BASE_URL}/api/v1/courses`;
export const TASKS_ENDPOINT = `${API_BASE_URL}/api/v1/tasks`;
export const CALENDAR_EVENTS_ENDPOINT = `${API_BASE_URL}/api/v1/calendar/events`;
export const NOTES_ENDPOINT = `${API_BASE_URL}/api/v1/notes`;
export const FOCUS_ENDPOINT = `${API_BASE_URL}/api/v1/focus/sessions`;
export const FILES_ENDPOINT = `${API_BASE_URL}/api/v1/files`;
export const LEARNING_LOG_ENDPOINT = `${API_BASE_URL}/api/v1/learning-logs`;
export const AI_STATUS_ENDPOINT = `${API_BASE_URL}/api/v1/ai/status`;
export const AI_REQUESTS_ENDPOINT = `${API_BASE_URL}/api/v1/ai/requests`;
export const STATS_ENDPOINT = `${API_BASE_URL}/api/v1/stats`;
export const QUESTIONS_ENDPOINT = `${API_BASE_URL}/api/v1/questions`;
export const REVIEW_QUEUE_ENDPOINT = `${API_BASE_URL}/api/v1/review/queue`;
export const EXAMS_ENDPOINT = `${API_BASE_URL}/api/v1/exams`;
export const EXAM_ATTEMPTS_ENDPOINT = `${API_BASE_URL}/api/v1/exam-attempts`;
export const SEMANTIC_SEARCH_ENDPOINT = `${API_BASE_URL}/api/v1/search/semantic`;
export const RAG_REINDEX_ENDPOINT = `${API_BASE_URL}/api/v1/rag/reindex`;
export const PDF_ANNOTATIONS_ENDPOINT = `${API_BASE_URL}/api/v1/pdf-annotations`;
export const ANALYTICS_ENDPOINT = `${API_BASE_URL}/api/v1/analytics/overview`;
export const MEMORIES_ENDPOINT = `${API_BASE_URL}/api/v1/memories`;
export const TUTOR_ENDPOINT = `${API_BASE_URL}/api/v1/ai/tutor`;
export const PLANS_ENDPOINT = `${API_BASE_URL}/api/v1/learning-plans`;
export const AUTOMATION_RULES_ENDPOINT = `${API_BASE_URL}/api/v1/automation/rules`;
export const AUTOMATION_RULES_DRAFT_ENDPOINT = `${AUTOMATION_RULES_ENDPOINT}/draft`;
export const AUTOMATION_RUNS_ENDPOINT = `${API_BASE_URL}/api/v1/automation/runs`;
export const NOTIFICATIONS_ENDPOINT = `${API_BASE_URL}/api/v1/notifications`;
export const NOTIFICATIONS_DISPATCH_ENDPOINT = `${NOTIFICATIONS_ENDPOINT}/dispatch`;
export const NOTIFICATION_PREFERENCES_ENDPOINT = `${NOTIFICATIONS_ENDPOINT}/preferences`;
export const NOTIFICATION_DIGEST_ENDPOINT = `${NOTIFICATIONS_ENDPOINT}/digest`;
export const GOALS_ENDPOINT = `${API_BASE_URL}/api/v1/goals`;
export const HABITS_ENDPOINT = `${API_BASE_URL}/api/v1/habits`;
export const PROFILE_SUMMARY_ENDPOINT = `${API_BASE_URL}/api/v1/profile/summary`;
export const PROFILE_EXPORT_ENDPOINT = `${API_BASE_URL}/api/v1/profile/export`;
export const IMPORTS_ENDPOINT = `${API_BASE_URL}/api/v1/imports`;
export const MEDIA_ENDPOINT = `${API_BASE_URL}/api/v1/media`;
export const COMMENTS_ENDPOINT = `${API_BASE_URL}/api/v1/comments`;
export const INVITES_ENDPOINT = `${API_BASE_URL}/api/v1/invites`;
export const WEBHOOKS_ENDPOINT = `${API_BASE_URL}/api/v1/webhooks`;
export const SYSTEM_STATUS_ENDPOINT = `${API_BASE_URL}/api/v1/system/status`;

export function spaceEndpoint(spaceId: string): string {
  return `${SPACES_ENDPOINT}/${spaceId}`;
}

export function courseEndpoint(courseId: string): string {
  return `${COURSES_ENDPOINT}/${courseId}`;
}

export function taskEndpoint(taskId: string): string {
  return `${TASKS_ENDPOINT}/${taskId}`;
}

export function courseListEndpoint(spaceId: string): string {
  return `${COURSES_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function taskListEndpoint(spaceId: string): string {
  return `${TASKS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function calendarEventsEndpoint(spaceId: string): string {
  return `${CALENDAR_EVENTS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function notesListEndpoint(spaceId: string): string {
  return `${NOTES_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function noteEndpoint(noteId: string): string {
  return `${NOTES_ENDPOINT}/${noteId}`;
}

export function focusListEndpoint(spaceId: string): string {
  return `${FOCUS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function focusStopEndpoint(sessionId: string): string {
  return `${FOCUS_ENDPOINT}/${sessionId}/stop`;
}

export function filesListEndpoint(spaceId: string): string {
  return `${FILES_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function fileContentEndpoint(fileId: string): string {
  return `${FILES_ENDPOINT}/${fileId}/content`;
}

export function fileEndpoint(fileId: string): string {
  return `${FILES_ENDPOINT}/${fileId}`;
}

export function learningLogEndpoint(spaceId: string, days = 7): string {
  return `${LEARNING_LOG_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}&days=${days}`;
}

export function statsEndpoint(spaceId: string): string {
  return `${STATS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function questionsEndpoint(spaceId: string): string {
  return `${QUESTIONS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function reviewQueueEndpoint(spaceId: string): string {
  return `${REVIEW_QUEUE_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function questionAttemptEndpoint(questionId: string): string {
  return `${QUESTIONS_ENDPOINT}/${questionId}/attempts`;
}

export function gradesEndpoint(spaceId: string): string {
  return `${API_BASE_URL}/api/v1/grades?spaceId=${encodeURIComponent(spaceId)}`;
}

export function examAttemptsStartEndpoint(examId: string): string {
  return `${EXAMS_ENDPOINT}/${examId}/attempts`;
}

export function examAttemptEndpoint(attemptId: string): string {
  return `${EXAM_ATTEMPTS_ENDPOINT}/${attemptId}/submit`;
}

export function semanticSearchEndpoint(spaceId: string, query: string): string {
  return `${SEMANTIC_SEARCH_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}&q=${encodeURIComponent(query)}`;
}

export function pdfAnnotationsEndpoint(spaceId: string, fileId: string): string {
  return `${PDF_ANNOTATIONS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}&fileId=${encodeURIComponent(fileId)}`;
}

export function pdfAnnotationEndpoint(): string {
  return PDF_ANNOTATIONS_ENDPOINT;
}

export function analyticsEndpoint(spaceId: string): string {
  return `${ANALYTICS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function memoriesEndpoint(spaceId: string): string {
  return `${MEMORIES_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function memoryEndpoint(memoryId: string): string {
  return `${MEMORIES_ENDPOINT}/${memoryId}`;
}

export function plansListEndpoint(spaceId: string): string {
  return `${PLANS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function planStepEndpoint(planId: string): string {
  return `${PLANS_ENDPOINT}/${planId}/steps`;
}

export function automationRulesEndpoint(spaceId: string): string {
  return `${AUTOMATION_RULES_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function automationRunsEndpoint(spaceId: string): string {
  return `${AUTOMATION_RUNS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function automationRuleEndpoint(ruleId: string): string {
  return `${AUTOMATION_RULES_ENDPOINT}/${ruleId}`;
}

export function notificationReadEndpoint(notificationId: string): string {
  return `${NOTIFICATIONS_ENDPOINT}/${notificationId}/read`;
}

export function notificationsEndpoint(spaceId: string): string {
  return `${NOTIFICATIONS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function goalsEndpoint(spaceId: string): string {
  return `${GOALS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function habitsEndpoint(spaceId: string): string {
  return `${HABITS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function habitCheckinEndpoint(habitId: string): string {
  return `${HABITS_ENDPOINT}/${habitId}/checkins`;
}

export function profileSummaryEndpoint(spaceId: string): string {
  return `${PROFILE_SUMMARY_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function profileExportEndpoint(spaceId: string): string {
  return `${PROFILE_EXPORT_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function importsEndpoint(spaceId: string): string {
  return `${IMPORTS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function importCommitEndpoint(batchId: string): string {
  return `${IMPORTS_ENDPOINT}/${batchId}/commit`;
}

export function importRollbackEndpoint(batchId: string): string {
  return `${IMPORTS_ENDPOINT}/${batchId}/rollback`;
}

export function importOriginalEndpoint(batchId: string): string {
  return `${IMPORTS_ENDPOINT}/${batchId}/original`;
}

export function mediaEndpoint(kind: "ocr" | "transcribe", spaceId: string): string {
  return `${MEDIA_ENDPOINT}/${kind}?spaceId=${encodeURIComponent(spaceId)}`;
}

export function membersEndpoint(spaceId: string): string {
  return `${SPACES_ENDPOINT}/${spaceId}/members`;
}

export function memberEndpoint(spaceId: string, userId: string): string {
  return `${membersEndpoint(spaceId)}/${userId}`;
}

export function invitesEndpoint(spaceId: string): string {
  return `${SPACES_ENDPOINT}/${spaceId}/invites`;
}

export function inviteEndpoint(spaceId: string, inviteId: string): string {
  return `${invitesEndpoint(spaceId)}/${inviteId}`;
}

export function joinInviteEndpoint(token: string): string {
  return `${INVITES_ENDPOINT}/${token}/join`;
}

export function commentsEndpoint(spaceId: string): string {
  return `${COMMENTS_ENDPOINT}?spaceId=${encodeURIComponent(spaceId)}&entityType=space&entityId=${encodeURIComponent(spaceId)}`;
}

export function commentEndpoint(commentId: string): string {
  return `${COMMENTS_ENDPOINT}/${commentId}`;
}

export function webhooksEndpoint(spaceId: string): string {
  return `${SPACES_ENDPOINT}/${spaceId}/webhooks`;
}

export function webhookEndpoint(webhookId: string): string {
  return `${WEBHOOKS_ENDPOINT}/${webhookId}`;
}

export function webhookTestEndpoint(webhookId: string): string {
  return `${webhookEndpoint(webhookId)}/test`;
}

export function webhookDeliveriesEndpoint(webhookId: string): string {
  return `${webhookEndpoint(webhookId)}/deliveries`;
}
