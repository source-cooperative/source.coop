import { z } from "zod";

const count = z.number().int().nonnegative().finite();

export const CatalogEntrySchema = z.object({
  account_id: z.string().min(1),
  product_id: z.string().min(1),
  total_bytes: count.optional().catch(undefined),
  object_count: count.optional().catch(undefined),
  exts: z.record(count).optional().catch(undefined),
});

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
