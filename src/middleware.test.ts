/**
 * The ?tab=analytics → /-/analytics rewrite is invisible indirection whose
 * failure mode is a silently dead ANALYTICS tab — pin its behavior.
 */
import { NextRequest } from "next/server";
import {
  handleLocaleParam,
  handleProductAnalyticsTab,
  restoreOryCookies,
} from "./middleware";

const rewriteTarget = (url: string): string | null =>
  handleProductAnalyticsTab(new NextRequest(url))?.headers.get(
    "x-middleware-rewrite",
  ) ?? null;

it("rewrites the product analytics tab URL to the internal route", () => {
  expect(rewriteTarget("https://source.coop/acct/prod?tab=analytics")).toBe(
    "https://source.coop/acct/prod/-/analytics",
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
  // Not a two-segment product path
  expect(rewriteTarget("https://source.coop/acct?tab=analytics")).toBeNull();
  expect(
    rewriteTarget("https://source.coop/acct/prod/file.txt?tab=analytics"),
  ).toBeNull();
  // Two-segment top-level app routes are not products
  expect(
    rewriteTarget("https://source.coop/admin/analytics?tab=analytics"),
  ).toBeNull();
  expect(
    rewriteTarget("https://source.coop/products/new?tab=analytics"),
  ).toBeNull();
});

describe("restoreOryCookies", () => {
  it("decodes the padding Next.js encodes in a server action redirect", () => {
    expect(
      restoreOryCookies("theme=dark; ory_session_abc=MTcx_a-b%3D%3D; x=a%3Db"),
    ).toBe("theme=dark; ory_session_abc=MTcx_a-b==; x=a%3Db");
    expect(restoreOryCookies("ory_kratos_session=YQ%3D")).toBe(
      "ory_kratos_session=YQ=",
    );
  });

  it("leaves an unencoded header alone", () => {
    expect(restoreOryCookies("ory_session_abc=MTcx==; x=a%3Db")).toBeNull();
    expect(restoreOryCookies(null)).toBeNull();
  });
});

describe("handleLocaleParam", () => {
  const run = (url: string) => handleLocaleParam(new NextRequest(url));

  it("sets the locale cookie and redirects to the URL without ?lang", () => {
    const response = run("https://source.coop/acme/climate?lang=ja&tab=x");
    expect(response?.headers.get("location")).toBe(
      "https://source.coop/acme/climate?tab=x",
    );
    expect(response?.cookies.get("NEXT_LOCALE")?.value).toBe("ja");
  });

  it("drops an unsupported value without setting the cookie", () => {
    const response = run("https://source.coop/?lang=xx");
    expect(response?.headers.get("location")).toBe("https://source.coop/");
    expect(response?.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("ignores requests without ?lang", () => {
    expect(run("https://source.coop/acme/climate")).toBeNull();
  });
});
