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

import { IndividualAccount } from "./account";
import { Membership } from "./membership";
import type { Session } from "@ory/client-fetch";

export interface UserSession {
  identity_id: string | null;
  account?: IndividualAccount;
  memberships?: Membership[];
  orySession?: Session;
}
