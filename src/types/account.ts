/**
 * @fileoverview Type definitions and schemas for Account entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * account management in the Source Cooperative application.
 *
 * @module types/account
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  MIN_ID_LENGTH,
  MAX_ID_LENGTH,
  ID_REGEX,
  AccountFlagsSchema,
} from "./shared";

extendZodWithOpenApi(z);

export enum AccountType {
  INDIVIDUAL = "individual",
  ORGANIZATION = "organization",
  SERVICE = "service",
}

export const AccountTypeSchema = z
  .nativeEnum(AccountType, {
    errorMap: () => ({ message: "Invalid account type" }),
  })
  .openapi("AccountType");

// Email interface for managing multiple emails per account
const AccountEmailSchema = z
  .object({
    address: z.string().email(),
    verified: z.boolean(),
    verified_at: z.optional(z.string().datetime()),
    is_primary: z.boolean(),
    added_at: z.string().datetime(),
  })
  .openapi("AccountEmail");

export type AccountEmail = z.infer<typeof AccountEmailSchema>;

export const AccountProfileSchema = z
  .object({
    bio: z
      .preprocess((bio) => {
        if (!bio || typeof bio !== "string") return undefined;
        return bio === "" ? undefined : bio;
      }, z.optional(z.string().max(1024, "Bio must not exceed 1024 characters")))
      .openapi({ example: "Software Engineer @radiantearth" }),
    location: z
      .preprocess((location) => {
        if (!location || typeof location !== "string") return undefined;
        return location === "" ? undefined : location;
      }, z.optional(z.string().max(128, "Location must not exceed 128 characters")))
      .openapi({ example: "Augsburg, Germany" }),
    is_admin: z.boolean().optional(),
  })
  .openapi("AccountProfile");

export type AccountProfile = z.infer<typeof AccountProfileSchema>;

export const AccountProfileResponseSchema = AccountProfileSchema.extend({
  profile_image: z.optional(z.string()),
  type: z.optional(z.nativeEnum(AccountType)),
}).openapi("AccountProfileResponse");

export type AccountProfileResponse = z.infer<
  typeof AccountProfileResponseSchema
>;

export const AccountSchema = z
  .object({
    account_id: z
      .string()
      .min(
        MIN_ID_LENGTH,
        `Account ID must be at least ${MIN_ID_LENGTH} characters`
      )
      .max(
        MAX_ID_LENGTH,
        `Account ID must not exceed ${MAX_ID_LENGTH} characters`
      )
      .toLowerCase()
      .regex(
        ID_REGEX,
        "Account ID may not begin or end with a hyphen OR contain consecutive hyphens"
      )
      .openapi({ example: "account-id" }),
    type: z.nativeEnum(AccountType, {
      errorMap: () => ({ message: "Invalid account type" }),
    }),
    name: z.string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    }),
    emails: z.optional(z.array(AccountEmailSchema)),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    disabled: z.boolean(),
    flags: AccountFlagsSchema,
    metadata_public: AccountProfileSchema,
    metadata_private: z.optional(
      z.object({
        identity_id: z.string().openapi({ example: "identity-id" }),
      })
    ),
    identity_id: z.string().openapi({ example: "identity-id" }),
  })
  .openapi("Account");

export type Account = z.infer<typeof AccountSchema>;

export const AccountCreationRequestSchema = AccountSchema.pick({
  account_id: true,
  type: true,
  metadata_public: true,
}).openapi("AccountCreationRequest");

export type AccountCreationRequest = z.infer<
  typeof AccountCreationRequestSchema
>;
