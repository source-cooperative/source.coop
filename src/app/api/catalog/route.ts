import { NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { CATALOG_URL, parseCatalog } from "@/lib/catalog";

// The stats-only catalog the object-type cards read. The upstream file is
// several MB of STAC records; this keeps the few fields the cards use and
// lets Vercel's edge cache hold the result, so each region fetches upstream
// at most once an hour. Edge caching rather than revalidate: the upstream
// body is over Next's 2 MB fetch-cache limit, and a prerender would make
// every build depend on data.source.coop.
export const dynamic = "force-dynamic";

export async function GET() {
  const response = await fetch(CATALOG_URL, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Catalog upstream returned ${response.status}` },
      { status: StatusCodes.BAD_GATEWAY, headers: { "Cache-Control": "no-store" } },
    );
  }
  const entries = [...parseCatalog(await response.text()).values()];
  return NextResponse.json(entries, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
