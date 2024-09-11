import useSWR from "swr";
import { SWRResponse } from "swr";
import {
  AccountFlags,
  AccountProfileResponse,
  RedactedAPIKey,
} from "@/api/types";

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

export function getFlags(
  account_id: string,
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<AccountFlags[], ClientError> {
  return useSWR<AccountFlags[], ClientError>(
    { path: `/api/v1/accounts/${account_id}/flags` },
    { refreshInterval, revalidateOnFocus }
  );
}

export function getAPIKeys(
  account_id: string,
  refreshInterval: number = 5,
  revalidateOnFocus: boolean = false
): SWRResponse<RedactedAPIKey[], ClientError> {
  return useSWR<RedactedAPIKey[], ClientError>(
    { path: `/api/v1/accounts/${account_id}/api-keys` },
    { refreshInterval, revalidateOnFocus }
  );
}
