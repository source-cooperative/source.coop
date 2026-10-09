import { apiKeyChecksum, isApiKey, ServiceAccountKeySchema } from "./service-account-key";

// Checksums computed independently with Python's zlib.crc32. Keys are
// assembled at run time so that secret scanners don't flag this file.
const key = (body: string, checksum: string) => `sck_${body}${checksum}`;
const GOOD = key("a".repeat(30), "1yLcDB");

describe("apiKeyChecksum", () => {
  it("is zlib's CRC-32 of the body in six base62 digits", () => {
    expect(apiKeyChecksum("a".repeat(30))).toBe("1yLcDB");
    // A CRC above 2^31, which a signed 32-bit shift would get wrong.
    expect(apiKeyChecksum("0123456789ABCDEFGHIJabcdefghij")).toBe("4Us3aw");
    // A CRC below 62^5, whose checksum keeps its leading zero.
    expect(apiKeyChecksum("0".repeat(29) + "1")).toBe("010Ohw");
  });
});

describe("isApiKey", () => {
  it("accepts a key whose checksum holds", () => {
    expect(isApiKey(GOOD)).toBe(true);
  });

  it.each([
    ["a key cut short", GOOD.slice(0, -1)],
    ["a key with a character too many", `${GOOD}a`],
    ["a mistyped character", GOOD.replace("sck_a", "sck_b")],
    ["a mistyped checksum", `${GOOD.slice(0, -1)}C`],
    ["the wrong case", GOOD.replace("sck_", "SCK_")],
    ["a character outside base62", key(`${"a".repeat(29)}-`, "1yLcDB")],
    ["the checksum-less 47-character format", `sck_${"a".repeat(43)}`],
    ["surrounding whitespace, which callers trim", ` ${GOOD}\n`],
  ])("refuses %s", (_, token) => {
    expect(isApiKey(token)).toBe(false);
  });
});

describe("hint", () => {
  const record = (hint: string) =>
    ServiceAccountKeySchema.safeParse({
      key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
      account_id: "acme--nightly-sync",
      label: "CI",
      hint,
      created_at: "2026-09-29T00:00:00Z",
      created_by: "alice",
      expires_at: null,
    }).success;

  it("is the checksum, or the four characters recorded before keys had one", () => {
    expect(record("1yLcDB")).toBe(true);
    expect(record("Xy9Q")).toBe(true);
    expect(record("a_7k")).toBe(true);
    expect(record("1yLcD")).toBe(false);
    expect(record("1yLc-B")).toBe(false);
  });
});
