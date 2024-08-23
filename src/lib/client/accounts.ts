import useSWR from "swr";
import { SWRResponse } from "swr";
import { AccountProfileResponse } from "@/lib/api/types";

export type ClientError = {
  status: number;
};

export function getProfile(
  account_id: string,
  refreshInterval: number = null,
  revalidateOnFocus: boolean = false
): SWRResponse<AccountProfileResponse, ClientError> {
  return useSWR<AccountProfileResponse, ClientError>(
    { path: `/api/accounts/${account_id}/profile` },
    { refreshInterval, revalidateOnFocus }
  );
}
