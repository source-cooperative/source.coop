import { CatalogEntrySchema, type CatalogEntry } from "@/types/catalog";

export const CATALOG_URL =
  "https://data.source.coop/source/metadata-catalog/catalog.jsonl";

export function parseCatalog(text: string): Map<string, CatalogEntry> {
  const entries = new Map<string, CatalogEntry>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const result = CatalogEntrySchema.safeParse(JSON.parse(line));
      if (result.success) {
        const entry = result.data;
        entries.set(`${entry.account_id}/${entry.product_id}`, entry);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

let catalogRequest: Promise<Map<string, CatalogEntry>> | undefined;

export function loadCatalog(): Promise<Map<string, CatalogEntry>> {
  if (!catalogRequest) {
    catalogRequest = fetch(CATALOG_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Catalog request: ${response.status}`);
        return parseCatalog(await response.text());
      })
      .catch((error: unknown) => {
        catalogRequest = undefined;
        throw error;
      });
  }
  return catalogRequest;
}
