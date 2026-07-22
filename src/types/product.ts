import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AccountSchema } from "@/types/account";

extendZodWithOpenApi(z);

// ProductMirror describes a storage mirror for a product: which data connection
// backs it, the key prefix under which the product's objects live, and whether
// it is the primary mirror.
export const ProductMirrorSchema = z
  .object({
    connection_id: z.string(), // Reference to storage connection config
    prefix: z.string(), // Format: "{account_id}/{product_id}/"
    // Mirror-specific settings
    is_primary: z.boolean(), // Is this the primary mirror?
  })
  .openapi("ProductMirror");

export type ProductMirror = z.infer<typeof ProductMirrorSchema>;

// A Digital Object Identifier: "10.<registrant>/<suffix>" (e.g. 10.1234/foo.bar).
// Stored bare (without the https://doi.org/ prefix), since that prefix is added
// when rendering links and schema.org identifiers. Pattern from Crossref:
// https://www.crossref.org/blog/dois-and-matching-regular-expressions/
const DOI_REGEX = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;

export const DoiSchema = z
  .string()
  .trim()
  .regex(DOI_REGEX, "Invalid DOI (expected a bare DOI such as 10.1234/foo.bar)");

// Metadata for a product, including mirrors, roles, and tags
export const ProductMetadataSchema = z
  .object({
    mirrors: z.record(ProductMirrorSchema),
    primary_mirror: z.string(), // Key of the primary mirror (e.g., "aws-us-east-1")
    tags: z.array(z.string()).optional(),
    doi: DoiSchema.optional(), // Digital Object Identifier
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
