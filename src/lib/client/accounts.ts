import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
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
  refreshInterval: number = 5000,
  revalidateOnFocus: boolean = false
): SWRResponse<AccountProfileResponse, ClientError> {
  return useSWRImmutable<AccountProfileResponse, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null
  );
}

export function getFlags(
  account_id: string,
  refreshInterval: number = 5000,
  revalidateOnFocus: boolean = false
): SWRResponse<AccountFlags[], ClientError> {
  return useSWR<AccountFlags[], ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/flags` } : null,
    { refreshInterval, revalidateOnFocus }
  );
}

export function getAPIKeys(
  account_id: string,
  refreshInterval: number = 5000,
  revalidateOnFocus: boolean = false
): SWRResponse<RedactedAPIKey[], ClientError> {
  return useSWR<RedactedAPIKey[], ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/api-keys` } : null,
    { refreshInterval, revalidateOnFocus }
  );
}
