export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

export const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;
export const AUTH_GUEST_ENDPOINT = `${API_BASE_URL}/api/v1/auth/guest`;
export const SPACES_ENDPOINT = `${API_BASE_URL}/api/v1/spaces`;
