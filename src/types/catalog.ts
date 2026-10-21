import { z } from "zod";

const count = z.number().int().nonnegative().finite();

export const CatalogEntrySchema = z.object({
  id: z.string().optional(),
  account_id: z.string().min(1),
  product_id: z.string().min(1),
  total_bytes: count.optional().catch(undefined),
  object_count: count.optional().catch(undefined),
  exts: z.record(count).optional().catch(undefined),
  ext_bytes: z.record(count).optional().catch(undefined),
  /** When the product's objects last changed, per the storage inventory. */
  objects_updated_at: z.string().datetime({ offset: true }).optional().catch(undefined),
  /** A storage convention the product follows, such as zarr or icechunk. */
  store_format: z.string().min(1).optional().catch(undefined),
});

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
