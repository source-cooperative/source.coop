import type { ServiceAccount } from "./account";
import type { AccountTrust } from "./account-trust";
import type { Membership } from "./membership";
import type { ServiceAccountKey } from "./service-account-key";

export interface ServiceAccountFormState {
  fieldErrors: Record<string, string[]>;
  message: string;
  success: boolean;
}

export interface ServiceAccountActionState {
  message: string;
  success: boolean;
}

export interface ApiKeyActionState {
  message: string;
  success: boolean;
  /** Set once, on the issue that created it: the only time the key is seen. */
  issued?: { key: string; record: ServiceAccountKey };
}

/** A service account with how it signs in and what it may reach. */
export interface ServiceAccountSummary {
  account: ServiceAccount;
  trusts: AccountTrust[];
  grants: Membership[];
  keys: ServiceAccountKey[];
}

export const IDLE_SERVICE_ACCOUNT_FORM_STATE: ServiceAccountFormState = {
  fieldErrors: {},
  message: "",
  success: false,
};

export const IDLE_SERVICE_ACCOUNT_ACTION_STATE: ServiceAccountActionState = {
  message: "",
  success: false,
};

export const IDLE_API_KEY_ACTION_STATE: ApiKeyActionState = {
  message: "",
  success: false,
};
