/**
 * @fileoverview Shared type definitions and constants used across multiple modules.
 *
 * This module defines common constants, enums, and types that are shared between
 * different entity types in the Source Cooperative application.
 *
 * @module types/shared
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// Common constants
export const MIN_ID_LENGTH = 3;
export const MAX_ID_LENGTH = 40;
// Account-owned connection IDs are namespaced as `${account_id}--${slug}`, so
// they need room for two ID segments plus the 2-char `--` delimiter.
export const MAX_DATA_CONNECTION_ID_LENGTH = MAX_ID_LENGTH * 2 + 2;
export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 100;
const ID_PART = "[a-z0-9](?:(?!--)[a-z0-9-])*[a-z0-9]";
export const ID_REGEX = new RegExp(`^${ID_PART}$`);
// A service account's id is its owner's id and its own short id, joined by the
// `--` no person's or organization's id may contain: it is unique per owner
// rather than across the platform, it never takes a handle a person or an
// organization might want, and it can never equal an Ory identity id (a UUID).
export const SERVICE_ACCOUNT_ID_REGEX = new RegExp(`^${ID_PART}--${ID_PART}$`);
export const MAX_SERVICE_ACCOUNT_ID_LENGTH = MAX_ID_LENGTH * 2 + 2;
// Any account's id: a person's or organization's, or a service account's.
export const ACCOUNT_ID_REGEX = new RegExp(`^${ID_PART}(?:--${ID_PART})?$`);
export const serviceAccountId = (owner_account_id: string, local_id: string) =>
  `${owner_account_id}--${local_id}`;
// Like ID_REGEX but permits consecutive hyphens, so an account-owned connection
// id can use `--` as the `${account_id}--${slug}` delimiter. Both halves are
// still validated with the strict ID_REGEX before composing, so the only `--`
// is the separator.
export const DATA_CONNECTION_ID_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * The id a name would produce: lowercase, runs of anything else collapsed to a
 * single hyphen, trimmed to MAX_ID_LENGTH.
 *
 * Lives beside the rules it has to satisfy. Collapsing runs is what guarantees
 * no `--` (reserved as the `${account_id}--${slug}` delimiter), and trimming
 * both ends is what guarantees the leading/trailing alphanumeric ID_REGEX
 * demands — including after truncation, which can otherwise land on a hyphen.
 *
 * Returns "" when a name has fewer than MIN_ID_LENGTH usable characters; the
 * caller decides what to say about that.
 */
export function slugifyToId(name: string): string {
  const slug = name
    .normalize("NFKD")
    // Strip the combining marks NFKD split off, so "Ärchive" becomes "archive"
    // rather than "-rchive".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_ID_LENGTH)
    .replace(/-+$/, "");

  return slug.length >= MIN_ID_LENGTH ? slug : "";
}

// Common enums
export enum AccountFlags {
  ADMIN = "admin",
  CREATE_REPOSITORIES = "create_repositories",
  CREATE_ORGANIZATIONS = "create_organizations",
  CREATE_DATA_CONNECTIONS = "create_data_connections",
}

export const DEFAULT_INDIVIDUAL_FLAGS: AccountFlags[] = [];

export const DEFAULT_ORGANIZATION_FLAGS: AccountFlags[] = [];

// Common schemas
export const AccountFlagsSchema = z
  .array(
    z.nativeEnum(AccountFlags, {
      errorMap: () => ({ message: "Invalid account flag" }),
    })
  )
  .openapi("AccountFlags");

// Common types
export type ErrorResponse = {
  code: number;
  message: string | object;
  errors?: any;
};

// Actions enum for authorization
export enum Actions {
  CreateRepository = "repository:create",
  PutRepository = "repository:put",
  DeleteRepository = "repository:delete",
  DisableRepository = "repository:disable",
  ListRepository = "repository:list",
  GetRepository = "repository:get",
  ListRepositoryAPIKeys = "repository:listAPIKeys",
  ListRepositoryMemberships = "repository:listMemberships",

  ReadRepositoryData = "repository:data:read",
  WriteRepositoryData = "repository:data:write",

  CreateAccount = "account:create",
  DisableAccount = "account:disable",
  // TODO: Need permission for editing account
  GetAccount = "account:get",
  ListAccount = "account:list",
  ListAccountAPIKeys = "account:listAPIKeys",
  ListAccountMemberships = "account:listMemberships",

  GetAccountFlags = "account:flags:get",
  PutAccountFlags = "account:flags:put",

  GetAccountProfile = "account:profile:get",
  PutAccountProfile = "account:profile:put",

  GetAPIKey = "api_key:get",
  CreateAPIKey = "api_key:create",
  RevokeAPIKey = "api_key:revoke",

  GetMembership = "membership:get",
  AcceptMembership = "membership:accept",
  RejectMembership = "membership:reject",
  RevokeMembership = "membership:revoke",
  InviteMembership = "membership:invite",
  UpdateMembershipRole = "membership:role:update",

  GetDataConnection = "data_connection:get",
  CreateDataConnection = "data_connection:create",
  DisableDataConnection = "data_connection:disable",
  DeleteDataConnection = "data_connection:delete",
  UseDataConnection = "data_connection:use",
  PutDataConnection = "data_connection:put",
}
