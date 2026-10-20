export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

export const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;
export const AUTH_GUEST_ENDPOINT = `${API_BASE_URL}/api/v1/auth/guest`;
export const SPACES_ENDPOINT = `${API_BASE_URL}/api/v1/spaces`;
export const COURSES_ENDPOINT = `${API_BASE_URL}/api/v1/courses`;
export const TASKS_ENDPOINT = `${API_BASE_URL}/api/v1/tasks`;
export const CALENDAR_EVENTS_ENDPOINT = `${API_BASE_URL}/api/v1/calendar/events`;

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
