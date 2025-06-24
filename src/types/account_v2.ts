import { AccountEmail } from "@/types/account";
import { AccountFlags } from "@/types/shared";
import { AccountType } from "./account";

// Domain interface for managing domain ownership
export interface AccountDomain {
  domain: string;
  status: "unverified" | "pending" | "verified";
  verification_method?: "dns" | "html" | "file";
  verification_token?: string;
  verified_at?: string;
  created_at: string;
  expires_at?: string;
}

// Base interface for shared properties
interface BaseAccount {
  account_id: string;
  type: AccountType;
  name: string;
  emails?: AccountEmail[];
  created_at: string;
  updated_at: string;
  disabled: boolean;
  flags: AccountFlags[];
  metadata_public: {
    location?: string;
    bio?: string;
    domains?: AccountDomain[];
  };
  metadata_private: {
    identity_id: string;
  };
}

// Interface for individual accounts
export interface IndividualAccount extends BaseAccount {
  type: AccountType.INDIVIDUAL;
  metadata_public: {
    location?: string;
    bio?: string;
    orcid?: string;
    domains?: AccountDomain[];
  };
}

// Interface for organizational accounts
export interface OrganizationalAccount extends BaseAccount {
  type: AccountType.ORGANIZATION;
  metadata_public: {
    location?: string;
    bio?: string;
    ror_id?: string;
    domains?: AccountDomain[];
    owner_account_id?: string;
    admin_account_ids?: string[];
    member_account_ids?: string[];
  };
}

// Union type for any kind of account
export type AccountV2 = IndividualAccount | OrganizationalAccount;
