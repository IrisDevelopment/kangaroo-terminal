export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: "include",
  });
}
