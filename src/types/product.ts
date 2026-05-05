import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AccountSchema } from "@/types/account";

extendZodWithOpenApi(z);

// Mirror configuration and status tracking
// ProductMirror describes a storage mirror for a product, including config, sync status, and stats.
export const ProductMirrorSchema = z
  .object({
    storage_type: z.enum(["s3", "azure", "gcs", "minio", "ceph"]),
    connection_id: z.string(), // Reference to storage connection config
    prefix: z.string(), // Format: "{account_id}/{product_id}/"
    // Mirror-specific settings
    is_primary: z.boolean(), // Is this the primary mirror?
  })
  .openapi("ProductMirror");

export type ProductMirror = z.infer<typeof ProductMirrorSchema>;

// Metadata for a product, including mirrors, roles, and tags
export const ProductMetadataSchema = z
  .object({
    mirrors: z.record(ProductMirrorSchema),
    primary_mirror: z.string(), // Key of the primary mirror (e.g., "aws-us-east-1")
    tags: z.array(z.string()).optional(),
    doi: z.string().optional(), // Digital Object Identifier
  })
  .openapi("ProductMetadata");

export type ProductMetadata = z.infer<typeof ProductMetadataSchema>;

export enum ProductVisibility {
  Public = "public",
  Unlisted = "unlisted",
  Restricted = "restricted",
}

export const ProductVisibilitySchema = z.nativeEnum(ProductVisibility).openapi("ProductVisibility");

// Main product interface matching new schema
// Product is the main product entity, including metadata and optional account
export const ProductSchema = z
  .object({
    product_id: z.string(), // Partition Key
    account_id: z.string(), // Sort Key
    title: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    visibility: ProductVisibilitySchema,
    metadata: ProductMetadataSchema,
    account: AccountSchema.optional(),
    disabled: z.boolean(),
    featured: z.number(),

    search_text: z.string().optional(),
  })
  .openapi("Product");

export type Product = z.infer<typeof ProductSchema>;

export const ProductCreationRequestSchema = ProductSchema.omit({
  created_at: true,
  updated_at: true,
  account: true,
  disabled: true,
  featured: true,

  metadata: true,
}).openapi("ProductCreationRequest");

export type ProductCreationRequest = z.infer<
  typeof ProductCreationRequestSchema
>;

export interface ProductObject {
  id: string;
  product_id: string;
  path: string;
  size: number;
  type?: "directory" | "file" | string; // For MIME types or other custom types
  mime_type?: string; // Optional explicit MIME type for files
  created_at: string;
  updated_at: string;
  checksum: string;
  content?: Buffer | string; // Added for storage client responses
  metadata?: {
    sha256?: string;
    sha1?: string;
    [key: string]: string | number | boolean | null | undefined; // More specific types for metadata values
  };
  isDirectory?: boolean; // Whether this is a directory
}
