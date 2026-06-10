/**
 * @fileoverview Helpers for reconciling email-verification state between Ory
 * (the upstream identity provider) and our own DynamoDB account record.
 *
 * Ory is the source of truth for whether an email has been verified. We mirror
 * that state onto the account so the rest of the app can read it without a
 * round-trip to Ory. These helpers are intentionally pure so they can be unit
 * tested and shared between the page-load banner and the email-verified page.
 */

import type { Session } from "@ory/client-fetch";
import type { Account, AccountEmail } from "@/types";

/**
 * Whether our own DynamoDB record already tracks the account as having a
 * verified email. This is the state we maintain locally.
 */
export function isEmailVerifiedInDb(account: Account): boolean {
  return Boolean(account.emails?.some((email) => email.verified));
}

/**
 * Whether Ory reports at least one verified email address for this session.
 */
export function isEmailVerifiedInOry(orySession?: Session): boolean {
  return Boolean(
    orySession?.identity?.verifiable_addresses?.some(
      (address) => address.verified,
    ),
  );
}

/**
 * Projects Ory's verifiable addresses onto our {@link AccountEmail} shape so the
 * verified state can be persisted to DynamoDB. The first address is treated as
 * primary, mirroring Ory's ordering.
 */
export function oryAddressesToAccountEmails(orySession?: Session): AccountEmail[] {
  const addresses = orySession?.identity?.verifiable_addresses ?? [];
  return addresses.map((address, index) => ({
    address: address.value,
    verified: address.verified,
    is_primary: index === 0,
    added_at: (address.created_at ?? new Date()).toISOString(),
    verified_at: address.verified
      ? address.verified_at?.toISOString()
      : undefined,
  }));
}
