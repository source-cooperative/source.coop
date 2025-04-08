import { apiFetch } from './fetch';
import type { ProductObject } from '@/types';

export function fetchObjects(account_id: string, product_id: string, path: string = '') {
  const endpoint = path 
    ? `/api/${account_id}/${product_id}/objects/${path}`
    : `/api/${account_id}/${product_id}/objects`;
  
  return apiFetch<Partial<ProductObject>[]>(endpoint);
}

export function fetchObject(account_id: string, product_id: string, path: string) {
  return apiFetch<Partial<ProductObject>>(`/api/${account_id}/${product_id}/objects/${path}`);
} 