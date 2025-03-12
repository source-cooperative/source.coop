import { apiFetch } from './fetch';
import type { Object } from '@/types/object';

export function fetchObjects(account_id: string, repository_id: string) {
  return apiFetch<Object[]>(`/api/${account_id}/${repository_id}/objects`);
}

export function fetchObject(account_id: string, repository_id: string, path: string) {
  return apiFetch<Object>(`/api/${account_id}/${repository_id}/objects/${path}`);
} 