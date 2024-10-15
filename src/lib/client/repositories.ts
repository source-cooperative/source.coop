import useSWR from "swr";
import { SWRResponse } from "swr";
import {
  Repository,
  RepositoryList,
  RepositoryListResponse,
} from "@/api/types";

export function listFeaturedRepositories(
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<RepositoryListResponse, Error> {
  return useSWR<RepositoryListResponse, Error>(
    { path: "/api/v1/repositories/featured" },
    { refreshInterval, revalidateOnFocus }
  );
}

export function listRepositories(
  page: number = 1,
  limit: number = 10,
  search_term?: string,
  tags?: string[],
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<RepositoryListResponse, Error> {
  return useSWR<RepositoryListResponse, Error>(
    {
      path: "/api/v1/repositories/",
      args: { next: page, limit, tags, q: search_term },
    },
    { refreshInterval, revalidateOnFocus }
  );
}

export function listRepositoriesByAccount(
  account_id: string,
  page: number = 1,
  limit: number = 10,
  search_term?: string,
  tags?: string[],
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<RepositoryList, Error> {
  return useSWR<RepositoryList, Error>(
    {
      path: `/api/v1/repositories/${account_id}`,
      args: { next: page, limit, tags, q: search_term },
    },
    { refreshInterval, revalidateOnFocus }
  );
}

export function getRepository(
  account_id: string,
  repository_id: string,
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<Repository, Error> {
  return useSWR<Repository, Error>(
    {
      path: `/api/v1/repositories/${account_id}/${repository_id}`,
    },
    { refreshInterval, revalidateOnFocus }
  );
}
