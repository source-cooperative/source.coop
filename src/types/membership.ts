/**
 * @fileoverview Type definitions and schemas for Membership entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * membership management in the Source Cooperative application.
 *
 * @module types/membership
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { MIN_ID_LENGTH, MAX_ID_LENGTH, ID_REGEX } from "./shared";

extendZodWithOpenApi(z);

export enum MembershipRole {
  Owners = "owners",
  Maintainers = "maintainers",
  ReadData = "read_data",
  WriteData = "write_data",
}

export const MembershipRoleSchema = z
  .nativeEnum(MembershipRole, {
    errorMap: () => ({ message: "Invalid membership role" }),
  })
  .openapi("MembershipRole");

export enum RepositoryPermissions {
  Write = "write",
  Read = "read",
}

export const RepositoryPermissionsResponseSchema = z.array(
  z.nativeEnum(RepositoryPermissions)
);
export type RepositoryPermissionsResponse = z.infer<
  typeof RepositoryPermissionsResponseSchema
>;

export enum MembershipState {
  Invited = "invited",
  Revoked = "revoked",
  Member = "member",
}

export const MembershipStateSchema = z
  .nativeEnum(MembershipState, {
    errorMap: () => ({ message: "Invalid membership state" }),
  })
  .openapi("MembershipState");

export const MembershipSchema = z
  .object({
    membership_id: z
      .string()
      .uuid()
      .openapi({ example: "00000000-0000-0000-0000-000000000000" }),
    account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid account ID format")
      .openapi({ example: "account-id" }),
    membership_account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid membership account ID format")
      .openapi({ example: "organization-id" }),
    repository_id: z
      .optional(
        z
          .string()
          .min(MIN_ID_LENGTH)
          .max(MAX_ID_LENGTH)
          .toLowerCase()
          .regex(ID_REGEX, "Invalid repository ID format")
      )
      .openapi({ example: "repository-id" }),
    role: MembershipRoleSchema,
    state: MembershipStateSchema,
    state_changed: z.string().datetime("Invalid date format for state changed"),
  })
  .openapi("Membership");

export type Membership = z.infer<typeof MembershipSchema>;

export const MembershipInvitationSchema = MembershipSchema.pick({
  account_id: true,
  role: true,
}).openapi("MembershipInvitation");

export type MembershipInvitation = z.infer<typeof MembershipInvitationSchema>;
