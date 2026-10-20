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
