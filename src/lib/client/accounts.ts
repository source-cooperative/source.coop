import useSWR from "swr";
import { SWRResponse } from "swr";
import { AccountProfileResponse } from "@/api/types";

export type ClientError = {
  status: number;
};

export function getProfile(
  account_id: string,
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<AccountProfileResponse, ClientError> {
  return useSWR<AccountProfileResponse, ClientError>(
    { path: `/api/v1/accounts/${account_id}/profile` },
    { refreshInterval, revalidateOnFocus }
  );
}
