import {
  slugifyToId,
  ID_REGEX,
  MAX_ID_LENGTH,
  MIN_ID_LENGTH,
} from "../shared";

describe("slugifyToId", () => {
  it("lowercases and hyphenates a plain name", () => {
    expect(slugifyToId("Cascadia Archive")).toBe("cascadia-archive");
  });

  it("collapses a run of separators into a single hyphen", () => {
    // Not cosmetic: `--` is the ${account_id}--${slug} delimiter, so a slug
    // containing one would shadow another account's namespace.
    expect(slugifyToId("Cascadia  ///  Archive")).toBe("cascadia-archive");
    expect(slugifyToId("a - b")).toBe("a-b");
  });

  it("trims leading and trailing separators", () => {
    expect(slugifyToId("  ...Archive!!  ")).toBe("archive");
  });

  it("folds accents to their base letters rather than dropping them", () => {
    expect(slugifyToId("Ärchive")).toBe("archive");
  });

  it("truncates to the maximum without ending on a hyphen", () => {
    const slug = slugifyToId("a".repeat(MAX_ID_LENGTH) + " tail");
    expect(slug).toHaveLength(MAX_ID_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("never ends on a hyphen even when truncation lands on one", () => {
    // "aaa…a b" truncated exactly at the hyphen would leave a trailing one.
    const name = "a".repeat(MAX_ID_LENGTH - 1) + " bbb";
    expect(slugifyToId(name).endsWith("-")).toBe(false);
  });

  it("returns empty when there is too little to work with", () => {
    expect(slugifyToId("!!!")).toBe("");
    expect(slugifyToId("ab")).toBe("");
    expect(slugifyToId("")).toBe("");
  });

  it("produces something the id rules actually accept", () => {
    const names = [
      "Cascadia Archive",
      "AWS Open Data (us-west-2)",
      "Ärchive — 2019/2024",
      "a".repeat(80),
      "___weird___name___",
    ];

    for (const name of names) {
      const slug = slugifyToId(name);
      expect(slug).not.toBe("");
      expect(slug).toMatch(ID_REGEX);
      expect(slug.length).toBeGreaterThanOrEqual(MIN_ID_LENGTH);
      expect(slug.length).toBeLessThanOrEqual(MAX_ID_LENGTH);
      expect(slug).not.toContain("--");
    }
  });
});
