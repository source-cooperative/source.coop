import { NextResponse } from "next/server";
import { generateDocument } from "@/lib/api/openapi";

// Each route registers its own path when its module loads. A route missing
// from this list is missing from the document, which route-coverage.test.ts
// catches.
import "../v1/accounts/route";
import "../v1/accounts/[account_id]/route";
import "../v1/accounts/[account_id]/keys/route";
import "../v1/accounts/[account_id]/keys/[key_id]/route";
import "../v1/accounts/[account_id]/service-accounts/route";
import "../v1/accounts/[account_id]/trusts/route";
import "../v1/accounts/[account_id]/trusts/exchanges/route";
import "../v1/data-connections/route";
import "../v1/data-connections/[data_connection_id]/route";
import "../v1/memberships/route";
import "../v1/memberships/[membership_id]/route";
import "../v1/products/route";
import "../v1/products/featured/route";
import "../v1/products/[account_id]/route";
import "../v1/products/[account_id]/[product_id]/route";
import "../v1/products/[account_id]/[product_id]/permissions/route";
import "../v1/products/[account_id]/[product_id]/mirrors/route";
import "../v1/products/[account_id]/[product_id]/mirrors/[connection_id]/route";
import "../v1/secret-scanning/github/route";
import "../v1/service-account-keys/exchanges/route";
import "../v1/service-account-keys/revocations/route";
import "../v1/whoami/route";

// The registry is complete once the imports above have run, so the document
// is built once per instance rather than per request.
const document = generateDocument();

// api.docs.source.coop renders this document from its own origin.
export function GET() {
  return NextResponse.json(document, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
