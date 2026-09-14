import { formatUrl } from "./format";

describe("formatUrl", () => {
  it("drops the scheme, a leading www, and a trailing slash", () => {
    expect(formatUrl("https://cholmes.org")).toBe("cholmes.org");
    expect(formatUrl("http://www.cholmes.org/")).toBe("cholmes.org");
    expect(formatUrl("cholmes.org")).toBe("cholmes.org");
    expect(formatUrl("https://example.com/path/")).toBe("example.com/path");
  });

  it("leaves a URL that already fits alone", () => {
    expect(formatUrl("https://example.com/a/b/c")).toBe("example.com/a/b/c");
    // Exactly at the budget still counts as fitting.
    const exact = "a".repeat(30) + ".io";
    expect(formatUrl(exact, exact.length)).toBe(exact);
  });

  it("keeps the host and as many whole trailing segments as fit", () => {
    expect(
      formatUrl("https://github.com/source-cooperative/source.coop/tree/main")
    ).toBe("github.com/…/tree/main");
    expect(
      formatUrl("https://example.com/a/bbbbbbbbbbbbbbbbbbbbbbbbbb/c")
    ).toBe("example.com/…/c");
  });

  it("cuts inside the last segment when no boundary fits", () => {
    expect(formatUrl("https://www.linkedin.com/in/some-very-long-handle")).toBe(
      "linkedin.com/…e-very-long-handle"
    );
  });

  it("keeps a query and a hash, which are what distinguish the link", () => {
    expect(formatUrl("https://example.com/a/b/verylongpage?ref=x#top", 24)).toBe(
      "example.com/…e?ref=x#top"
    );
  });

  it("tail-cuts a host that busts the budget on its own", () => {
    const host = "a-really-quite-long-hostname.example.com";
    const expected = host.slice(0, 31) + "…";
    expect(formatUrl(host)).toBe(expected);
    // The path is irrelevant once the host alone does not fit.
    expect(formatUrl(`https://${host}/some/path`)).toBe(expected);
  });

  it("passes a non-ASCII host through", () => {
    expect(formatUrl("https://例え.jp/ページ")).toBe("例え.jp/ページ");
  });

  it("never exceeds the budget, whatever the shape of the URL", () => {
    const urls = [
      "https://cholmes.org",
      "https://www.linkedin.com/in/some-very-long-handle",
      "https://github.com/source-cooperative/source.coop/tree/main",
      "https://a-really-quite-long-hostname.example.com/x/y/z",
      "https://example.com/one-single-extremely-long-path-segment",
    ];
    for (const max of [12, 20, 32, 60]) {
      for (const url of urls) {
        expect(formatUrl(url, max).length).toBeLessThanOrEqual(max);
      }
    }
  });
});
