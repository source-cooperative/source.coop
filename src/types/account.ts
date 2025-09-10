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
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
} from "./shared";

extendZodWithOpenApi(z);

export enum AccountType {
  INDIVIDUAL = "individual",
  ORGANIZATION = "organization",
  // SERVICE = "service",  // TODO: Enable when we support services
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

export const AccountDomainSchema = z.object({
  domain: z.string(),
  status: z.enum(["unverified", "pending", "verified"]),
  verification_method: z.enum(["dns", "html", "file"]).optional(),
  verification_token: z.string().optional(),
  verified_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
});

// Export the type for use in other files
export type AccountDomain = z.infer<typeof AccountDomainSchema>;

const BaseAccountProfileSchema = z.object({
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
  domains: z.optional(z.array(AccountDomainSchema)),
});

const IndividualAccountProfileSchema = BaseAccountProfileSchema.extend({
  orcid: z.optional(z.string()),
  is_admin: z.boolean().optional(),
});

const OrganizationalAccountProfileSchema = BaseAccountProfileSchema.extend({
  ror_id: z.optional(z.string()),
});

export const AccountProfileSchema = z
  .union([IndividualAccountProfileSchema, OrganizationalAccountProfileSchema])
  .openapi("AccountProfile");

// Base account schema for shared properties
export const BaseAccountSchema = z.object({
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
  metadata_private: z.optional(z.record(z.any())),
});
// Individual account schema
export const IndividualAccountSchema = BaseAccountSchema.extend({
  type: z.literal(AccountType.INDIVIDUAL),
  identity_id: z.string().openapi({ example: "identity-id" }),
  metadata_public: IndividualAccountProfileSchema,
}).openapi("IndividualAccount");

export type IndividualAccount = z.infer<typeof IndividualAccountSchema>;

// Organizational account schema
export const OrganizationalAccountSchema = BaseAccountSchema.extend({
  type: z.literal(AccountType.ORGANIZATION),
  identity_id: z.undefined(),
  metadata_public: OrganizationalAccountProfileSchema,
}).openapi("OrganizationalAccount");

export type OrganizationalAccount = z.infer<typeof OrganizationalAccountSchema>;

export const AccountSchema = z
  .discriminatedUnion("type", [
    IndividualAccountSchema,
    OrganizationalAccountSchema,
  ])
  .openapi("Account");

export type Account = z.infer<typeof AccountSchema>;

export type AccountProfile = z.infer<typeof AccountProfileSchema>;

export const AccountProfileResponseSchema = z
  .union([
    IndividualAccountProfileSchema.extend({
      profile_image: z.optional(z.string()),
      type: z.optional(z.nativeEnum(AccountType)),
    }),
    OrganizationalAccountProfileSchema.extend({
      profile_image: z.optional(z.string()),
      type: z.optional(z.nativeEnum(AccountType)),
    }),
  ])
  .openapi("AccountProfileResponse");

export type AccountProfileResponse = z.infer<
  typeof AccountProfileResponseSchema
>;

export const AccountCreationRequestSchema = z
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
    name: z
      .string()
      .min(
        MIN_NAME_LENGTH,
        `Name must be at least ${MIN_NAME_LENGTH} characters`
      )
      .max(
        MAX_NAME_LENGTH,
        `Name must not exceed ${MAX_NAME_LENGTH} characters`
      ),
  })
  .openapi("AccountCreationRequest");

export type AccountCreationRequest = z.infer<
  typeof AccountCreationRequestSchema
>;

export const OrganizationCreationRequestSchema =
  AccountCreationRequestSchema.extend({
    owner_account_id: z.string(),
  });

export type OrganizationCreationRequest = z.infer<
  typeof OrganizationCreationRequestSchema
>;
