import { APIError } from '../errors';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new APIError(
      `API request failed: ${response.statusText}`,
      response.status
    );
  }

  return response.json();
} 