/**
 * @fileoverview Type definitions and schemas for Product entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * product management in the Source Cooperative application.
 *
 * @module types/product
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  MIN_ID_LENGTH,
  MAX_ID_LENGTH,
  ID_REGEX,
  RepositoryDataMode,
  RepositoryDataModeSchema,
} from "./shared";

extendZodWithOpenApi(z);

export const RepositoryMirrorSchema = z
  .object({
    data_connection_id: z.string(),
    prefix: z.string(),
  })
  .openapi("RepositoryMirror");

export type RepositoryMirror = z.infer<typeof RepositoryMirrorSchema>;

export const RepositoryDataSchema = z
  .object({
    primary_mirror: z.string({
      required_error: "Primary mirror is required",
      invalid_type_error: "Primary mirror must be a string",
    }),
    mirrors: z.record(RepositoryMirrorSchema),
  })
  .openapi("RepositoryData");

export const RepositoryMetaSchema = z
  .object({
    title: z.preprocess(
      (title) => {
        if (!title || typeof title !== "string") return undefined;
        return title === "" ? undefined : title;
      },
      z.string({
        required_error: "Title is required",
        invalid_type_error: "Title must be a string",
      })
    ),
    description: z.preprocess(
      (description) => {
        if (!description || typeof description !== "string") return undefined;
        return description === "" ? undefined : description;
      },
      z.string({
        required_error: "Description is required",
        invalid_type_error: "Description must be a string",
      })
    ),
    tags: z
      .string()
      .transform((value) => value.split(","))
      .pipe(z.string().trim().array()),
  })
  .openapi("RepositoryMeta");

export type RepositoryMeta = z.infer<typeof RepositoryMetaSchema>;

export type RepositoryListResponse = {
  repositories: Repository[];
  next?: string;
  count: Number;
};

export enum RepositoryState {
  Listed = "listed",
  Unlisted = "unlisted",
}

export const RepositoryStateSchema = z
  .nativeEnum(RepositoryState, {
    errorMap: () => ({ message: "Invalid repository mode" }),
  })
  .openapi("RepositoryState");

export enum RepositoryFeatured {
  Featured = 1,
  NotFeatured = 0,
}

export const RepositorySchema = z
  .object({
    account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid account ID format"),
    repository_id: z
      .string({
        required_error: "Repository ID is required",
        invalid_type_error: "Repository ID must be a string",
      })
      .min(MIN_ID_LENGTH, "Repository ID must be at least 3 characters long")
      .max(MAX_ID_LENGTH, "Repository ID may not be longer than 40 characters")
      .toLowerCase()
      .regex(ID_REGEX, "Invalid repository ID format"),
    state: RepositoryStateSchema,
    data_mode: RepositoryDataModeSchema,
    featured: z.nativeEnum(RepositoryFeatured, {
      errorMap: () => ({ message: "Invalid featured value" }),
    }),
    meta: RepositoryMetaSchema,
    data: RepositoryDataSchema,
    published: z.string().datetime({ offset: true }),
    disabled: z.boolean(),
  })
  .openapi("Repository");

// TODO: This should be renamed to Product
export type Repository = z.infer<typeof RepositorySchema>;

export const RepositoryListSchema = z
  .object({
    repositories: z.array(RepositorySchema),
    next: z.optional(z.string()),
  })
  .openapi("RepositoryListResponse");

export type RepositoryList = z.infer<typeof RepositoryListSchema>;

export const RepositoryCreationRequestSchema = RepositorySchema.pick({
  repository_id: true,
  data_mode: true,
  meta: true,
})
  .extend({
    data_connection_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid data connection ID format")
      .openapi({ example: "data-connection-id" }),
  })
  .openapi("RepositoryCreationRequest");

export type RepositoryCreationRequest = z.infer<
  typeof RepositoryCreationRequestSchema
>;

export const RepositoryUpdateRequestSchema = RepositorySchema.pick({
  meta: true,
  state: true,
}).openapi("RepositoryUpdateRequest");

export type RepositoryUpdateRequest = z.infer<
  typeof RepositoryUpdateRequestSchema
>;

export const RepositoryFeaturedUpdateRequestSchema = RepositorySchema.pick({
  featured: true,
}).openapi("RepositoryFeaturedUpdateRequest");

export type RepositoryFeaturedUpdateRequest = z.infer<
  typeof RepositoryFeaturedUpdateRequestSchema
>;
