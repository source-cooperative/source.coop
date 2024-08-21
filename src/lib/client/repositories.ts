import useSWR from "swr";
import { SWRResponse } from "swr";
import { Repository } from "@/lib/api/types";

export function listRepositories() {}

export function listFeaturedRepositories(
  refreshInterval: number = 5000
): SWRResponse<Repository[], Error> {
  return useSWR<Repository[], Error>(
    { path: "/api/repositories/featured" },
    { refreshInterval }
  );
}
