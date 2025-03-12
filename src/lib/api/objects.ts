import { apiFetch } from './fetch';
import type { RepositoryObject } from '@/types/repository_object';

export function fetchObjects(account_id: string, repository_id: string, path: string = '') {
  const endpoint = path 
    ? `/api/${account_id}/${repository_id}/objects/${path}`
    : `/api/${account_id}/${repository_id}/objects`;
  
  return apiFetch<Partial<RepositoryObject>[]>(endpoint);
}

export function fetchObject(account_id: string, repository_id: string, path: string) {
  return apiFetch<Partial<RepositoryObject>>(`/api/${account_id}/${repository_id}/objects/${path}`);
} 