import "server-only";

import { notFound } from "next/navigation";

import { getPageSession, productsTable } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types/shared";

/**
 * Fetch a product and enforce read authorization in one place. Calls
 * `notFound()` — yielding a 404 — when the product is missing or the viewer may
 * not read it. Every entry point for this route (layout, page, and
 * generateMetadata) goes through here, so unauthorized viewers never reach
 * product data — including the metadata exposed via HTTP headers and OG tags.
 *
 * Note: each entry point calls this independently, so the product/session reads
 * are not deduped within a request. Request-scoped caching of DB reads is left
 * to a dedicated change covering all reads rather than this one call site.
 */
export async function getAuthorizedProduct(
  account_id: string,
  product_id: string,
) {
  const [session, product] = await Promise.all([
    getPageSession(),
    productsTable.fetchById(account_id, product_id),
  ]);
  if (!product) {
    notFound();
  }
  if (!isAuthorized(session, product, Actions.GetRepository)) {
    notFound();
  }
  return product;
}
