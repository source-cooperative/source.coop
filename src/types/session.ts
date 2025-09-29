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

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { IndividualAccountSchema } from "./account";
import { MembershipSchema } from "./membership";

extendZodWithOpenApi(z);

export const UserSessionSchema = z
  .object({
    identity_id: z.optional(z.string()).openapi({ example: "identity-id" }),
    account: z.optional(IndividualAccountSchema),
    memberships: z.optional(z.array(MembershipSchema)),
  })
  .openapi("UserSession");

export type UserSession = z.infer<typeof UserSessionSchema>;
