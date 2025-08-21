/**
 * @fileoverview Type definitions and schemas for API Key entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * API key management in the Source Cooperative application.
 *
 * @module types/api-key
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { MIN_ID_LENGTH, MAX_ID_LENGTH, ID_REGEX } from "./shared";

extendZodWithOpenApi(z);

export const APIKeySchema = z
  .object({
    access_key_id: z
      .string({
        required_error: "Access key ID is required",
        invalid_type_error: "Access key ID must be a string",
      })
      .min(2)
      .max(24)
      .startsWith("SC")
      .toUpperCase()
      .openapi({ example: "SCFOOBAR" }),
    account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid account ID format")
      .openapi({ example: "account-id" }),
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
    disabled: z.boolean(),
    expires: z.string().datetime("Invalid expiration date format"),
    name: z
      .string({
        required_error: "API key name is required",
        invalid_type_error: "API key name must be a string",
      })
      .min(1)
      .max(128)
      .openapi({ example: "Dev Machine" }),
    secret_access_key: z
      .string({
        required_error: "Secret access key is required",
        invalid_type_error: "Secret access key must be a string",
      })
      .length(64),
  })
  .openapi("APIKey");

export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyRequestSchema = z
  .object({
    name: z
      .preprocess(
        (name) => {
          if (!name || typeof name !== "string") return undefined;
          return name === "" ? undefined : name;
        },
        z.string({
          required_error: "API key name is required",
          invalid_type_error: "API key name must be a string",
        })
      )
      .openapi({ example: "Dev Machine" }),
    expires: z.string().datetime("Invalid expiration date format"),
  })
  .openapi("APIKeyRequest");

export type APIKeyRequest = z.infer<typeof APIKeyRequestSchema>;

export const RedactedAPIKeySchema = APIKeySchema.omit({
  secret_access_key: true,
}).openapi("RedactedAPIKey");

export type RedactedAPIKey = z.infer<typeof RedactedAPIKeySchema>;
