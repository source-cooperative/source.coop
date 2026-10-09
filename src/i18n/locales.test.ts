import { negotiateLocale } from "./locales";
import en from "./messages/en.json";
import ja from "./messages/ja.json";

describe("negotiateLocale", () => {
  it("prefers the cookie over the browser", () => {
    expect(negotiateLocale("en", "ja-JP,ja;q=0.9")).toBe("en");
  });

  it("ignores an unsupported cookie", () => {
    expect(negotiateLocale("xx", "ja-JP")).toBe("ja");
  });

  it("takes the highest-weighted supported language", () => {
    expect(negotiateLocale(undefined, "fr;q=1,en;q=0.5,ja;q=0.8")).toBe("ja");
  });

  it("falls back to English", () => {
    expect(negotiateLocale(undefined, "fr-FR,de;q=0.9")).toBe("en");
    expect(negotiateLocale(undefined, null)).toBe("en");
  });
});

// Every key in en.json is a string the UI renders; a key missing from a
// translation renders as its raw path instead.
const keys = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

describe("messages", () => {
  it("ja has exactly the keys en has", () => {
    expect(keys(ja).sort()).toEqual(keys(en).sort());
  });
});
