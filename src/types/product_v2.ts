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
    config: z.object({
      region: z.string().optional(), // For S3/GCS
      bucket: z.string().optional(), // For S3/GCS
      container: z.string().optional(), // For Azure
      endpoint: z.string().optional(), // For MinIO/Ceph
    }),
    // Mirror-specific settings
    is_primary: z.boolean(), // Is this the primary mirror?
    sync_status: z.object({
      last_sync_at: z.string(),
      is_synced: z.boolean(),
      error: z.string().optional(),
    }),
    // Monitoring
    stats: z.object({
      total_objects: z.number(),
      total_size: z.number(),
      last_verified_at: z.string(),
    }),
  })
  .openapi("ProductMirror");

export type ProductMirror = z.infer<typeof ProductMirrorSchema>;

// Role assignment for product access
// ProductRole describes a role granted to an account for a product
export const ProductRoleSchema = z
  .object({
    account_id: z.string(),
    role: z.enum(["admin", "contributor", "viewer"]),
    granted_at: z.string(),
    granted_by: z.string(), // account_id of who granted the role
  })
  .openapi("ProductRole");

export type ProductRole = z.infer<typeof ProductRoleSchema>;

// Metadata for a product, including mirrors, roles, and tags
export const ProductMetadataSchema = z
  .object({
    mirrors: z.record(ProductMirrorSchema),
    primary_mirror: z.string(), // Key of the primary mirror (e.g., "aws-us-east-1")
    tags: z.array(z.string()).optional(),
    roles: z.record(ProductRoleSchema),
  })
  .openapi("ProductMetadata");

export type ProductMetadata = z.infer<typeof ProductMetadataSchema>;

export enum ProductDataMode {
  Open = "open",
  Subscription = "subscription",
  Private = "private",
}
export const ProductDataModeSchema = z
  .nativeEnum(ProductDataMode, {
    errorMap: () => ({ message: "Invalid product data mode" }),
  })
  .openapi("ProductDataMode");

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
    visibility: z.enum(["public", "unlisted", "restricted"]),
    metadata: ProductMetadataSchema,
    account: AccountSchema.optional(),
    disabled: z.boolean(),
    featured: z.number(),
    data_mode: ProductDataModeSchema,
  })
  .openapi("Product");

export type Product = z.infer<typeof ProductSchema>;

// Index interfaces for GSIs
// AccountProductsIndex is used for querying products by account
export const AccountProductsIndexSchema = z
  .object({
    account_id: z.string(), // PK
    created_at: z.string(), // SK
    product_id: z.string(), // Projected attribute
    title: z.string(), // Projected attribute
    visibility: z.string(), // Projected attribute
  })
  .openapi("AccountProductsIndex");

export type AccountProductsIndex = z.infer<typeof AccountProductsIndexSchema>;

// PublicProductsIndex is used for querying public products
export const PublicProductsIndexSchema = z
  .object({
    visibility: z.string(), // PK
    created_at: z.string(), // SK
    product_id: z.string(), // Projected attribute
    account_id: z.string(), // Projected attribute
    title: z.string(), // Projected attribute
  })
  .openapi("PublicProductsIndex");

export type PublicProductsIndex = z.infer<typeof PublicProductsIndexSchema>;
