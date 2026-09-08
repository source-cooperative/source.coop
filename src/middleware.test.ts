/**
 * The ?tab=analytics → /-/analytics rewrite is invisible indirection whose
 * failure mode is a silently dead ANALYTICS tab — pin its behavior.
 */
import { NextRequest } from "next/server";
import { handleAnalyticsTab } from "./middleware";

const rewriteTarget = (url: string): string | null =>
  handleAnalyticsTab(new NextRequest(url))?.headers.get(
    "x-middleware-rewrite",
  ) ?? null;

it("rewrites the product analytics tab URL to the internal route", () => {
  expect(rewriteTarget("https://source.coop/acct/prod?tab=analytics")).toBe(
    "https://source.coop/acct/prod/-/analytics",
  );
});

it("rewrites the account analytics tab URL to the internal route", () => {
  expect(rewriteTarget("https://source.coop/acct?tab=analytics")).toBe(
    "https://source.coop/acct/-/analytics",
  );
});

it("preserves other query params and drops tab", () => {
  expect(
    rewriteTarget("https://source.coop/acct/prod?tab=analytics&window=7"),
  ).toBe("https://source.coop/acct/prod/-/analytics?window=7");
});

it("ignores non-matching requests", () => {
  // No tab param / wrong value
  expect(rewriteTarget("https://source.coop/acct/prod")).toBeNull();
  expect(rewriteTarget("https://source.coop/acct/prod?tab=other")).toBeNull();
  // Deeper than an account or product root
  expect(
    rewriteTarget("https://source.coop/acct/prod/file.txt?tab=analytics"),
  ).toBeNull();
  // Top-level app routes are neither accounts nor products
  expect(
    rewriteTarget("https://source.coop/admin/analytics?tab=analytics"),
  ).toBeNull();
  expect(
    rewriteTarget("https://source.coop/products/new?tab=analytics"),
  ).toBeNull();
  expect(rewriteTarget("https://source.coop/products?tab=analytics")).toBeNull();
});
