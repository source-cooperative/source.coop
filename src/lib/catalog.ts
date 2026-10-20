import { CatalogEntrySchema, type CatalogEntry } from "@/types/catalog";

/** The full metadata catalog: STAC records, several MB. Read server-side only. */
export const CATALOG_URL =
  "https://data.source.coop/source/metadata-catalog/catalog.jsonl";

/** The app's cached, stats-only copy of the catalog (src/app/api/catalog). */
export const CATALOG_API = "/api/catalog";

const productKey = (entry: CatalogEntry) =>
  `${entry.account_id}/${entry.product_id}`;

export function parseCatalog(text: string): Map<string, CatalogEntry> {
  const entries = new Map<string, CatalogEntry>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const result = CatalogEntrySchema.safeParse(JSON.parse(line));
      if (result.success) {
        const entry = result.data;
        if (entry.id !== undefined && entry.id !== productKey(entry)) continue;
        entries.set(productKey(entry), entry);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

let catalogRequest: Promise<Map<string, CatalogEntry>> | undefined;
let loadedCatalog: Map<string, CatalogEntry> | undefined;

/**
 * The catalog if it has already loaded. Components that remount on every
 * navigation (the product layout re-renders per path) start from this so they
 * don't blank for a frame while the cached promise resolves.
 */
export function peekCatalog() {
  return loadedCatalog;
}

export function loadCatalog(): Promise<Map<string, CatalogEntry>> {
  if (!catalogRequest) {
    catalogRequest = fetch(CATALOG_API)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Catalog request: ${response.status}`);
        const entries: CatalogEntry[] = await response.json();
        return (loadedCatalog = new Map(entries.map((e) => [productKey(e), e])));
      })
      .catch((error: unknown) => {
        catalogRequest = undefined;
        throw error;
      });
  }
  return catalogRequest;
}
