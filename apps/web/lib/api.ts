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
export const AUTOMATION_RUNS_ENDPOINT = `${API_BASE_URL}/api/v1/automation/runs`;
export const NOTIFICATIONS_ENDPOINT = `${API_BASE_URL}/api/v1/notifications`;
export const NOTIFICATIONS_DISPATCH_ENDPOINT = `${NOTIFICATIONS_ENDPOINT}/dispatch`;

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
