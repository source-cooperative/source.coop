import useSWR from "swr";
import { SWRResponse } from "swr";
import { Repository, RepositoryListResponse } from "@/lib/api/types";

export function listFeaturedRepositories(
  refreshInterval: number = null,
  revalidateOnFocus: boolean = false
): SWRResponse<Repository[], Error> {
  return useSWR<Repository[], Error>(
    { path: "/api/repositories/featured" },
    { refreshInterval, revalidateOnFocus }
  );
}

export function listRepositories(
  page: number = 1,
  limit: number = 10,
  search_term?: string,
  tags?: string[],
  refreshInterval: number = null,
  revalidateOnFocus: boolean = false
): SWRResponse<RepositoryListResponse, Error> {
  console.log(search_term, page, limit, tags);
  return useSWR<RepositoryListResponse, Error>(
    {
      path: "/api/repositories/",
      args: { next: page, limit, tags, q: search_term },
    },
    { refreshInterval, revalidateOnFocus }
  );
}
