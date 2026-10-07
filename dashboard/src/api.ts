export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY;

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'x-api-key': API_KEY,
    },
  });
}