// Base interface for shared properties
export interface BaseAccount {
  account_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  type: 'individual' | 'organization';
  description?: string;  // Optional description for any account type
}

// Contact information interface for shared optional fields
export interface ContactInfo {
  email?: string;
  website?: string;
}

// Interface for individual accounts
export interface IndividualAccount extends BaseAccount, ContactInfo {
  type: 'individual';
  email: string;  // Note: email is required for individuals, overriding the optional in ContactInfo
  orcid?: string;  // Optional ORCID identifier (e.g., "0000-0002-1825-0097")
  // Login-related fields could go here if needed
}

// Interface for organizational accounts
export interface OrganizationalAccount extends BaseAccount, ContactInfo {
  type: 'organization';
  owner_account_id: string;  // References the IndividualAccount that owns this org
  admin_account_ids: string[];  // Array of IndividualAccount IDs who can administer
  ror_id?: string;  // Optional ROR identifier (e.g., "03yrm5c26")
}

// Union type for any kind of account
export type Account = IndividualAccount | OrganizationalAccount; 