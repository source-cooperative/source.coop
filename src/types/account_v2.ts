// Email interface for managing multiple emails per account
export interface AccountEmail {
  address: string;
  verified: boolean;
  verified_at?: string;
  is_primary: boolean;
  added_at: string;
}

// Domain interface for managing domain ownership
export interface AccountDomain {
  domain: string;
  status: 'unverified' | 'pending' | 'verified';
  verification_method?: 'dns' | 'html' | 'file';
  verification_token?: string;
  verified_at?: string;
  created_at: string;
  expires_at?: string;
}

// Base interface for shared properties
interface BaseAccount {
  account_id: string;
  type: 'individual' | 'organization';
  name: string;
  emails: AccountEmail[];
  created_at: string;
  updated_at: string;
  disabled: boolean;
  flags: string[];
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
  type: 'individual';
  metadata_public: {
    location?: string;
    bio?: string;
    orcid?: string;
    domains?: AccountDomain[];
  };
}

// Interface for organizational accounts
export interface OrganizationalAccount extends BaseAccount {
  type: 'organization';
  metadata_public: {
    location?: string;
    bio?: string;
    ror_id?: string;
    domains?: AccountDomain[];
  };
}

// Union type for any kind of account
export type Account = IndividualAccount | OrganizationalAccount; 