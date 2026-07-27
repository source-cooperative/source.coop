/**
 * @fileoverview Type definitions and schemas for User Session entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * user session management in the Source Cooperative application.
 *
 * @module types/session
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { Account } from "./account";
import { Membership } from "./membership";
import type { Session } from "@ory/client-fetch";

export interface UserSession {
  identity_id: string | null;
  account?: Account;
  memberships?: Membership[];
  orySession?: Session;
  /**
   * Present only when an admin is viewing the app as another user. Holds the
   * real admin's identity so the UI can surface a banner; every other field on
   * this session belongs to the impersonated target. See
   * `src/lib/services/impersonation.ts`.
   */
  impersonator?: { account_id: string; name: string };
}
