import { NextResponse } from "next/server";
import { generateDocument } from "@/lib/api/openapi";

// Each route registers its own path when its module loads. A route missing
// from this list is missing from the document, which route-coverage.test.ts
// catches.
import "../v1/accounts/[account_id]/members/route";
import "../v1/memberships/route";
import "../v1/memberships/[membership_id]/route";
import "../v1/memberships/[membership_id]/accept/route";
import "../v1/memberships/[membership_id]/reject/route";
import "../v1/memberships/[membership_id]/revoke/route";
import "../v1/products/[account_id]/[repository_id]/members/route";

// api.docs.source.coop renders this document from its own origin.
export function GET() {
  return NextResponse.json(generateDocument(), {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
