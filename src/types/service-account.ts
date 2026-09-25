import type { ServiceAccount } from "./account";
import type { AccountTrust } from "./account-trust";
import type { Membership } from "./membership";

export interface ServiceAccountFormState {
  fieldErrors: Record<string, string[]>;
  message: string;
  success: boolean;
}

export interface ServiceAccountActionState {
  message: string;
  success: boolean;
}

/** A service account with how it signs in and what it may reach. */
export interface ServiceAccountSummary {
  account: ServiceAccount;
  trusts: AccountTrust[];
  grants: Membership[];
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
