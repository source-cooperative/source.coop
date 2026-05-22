/**
 * @jest-environment node
 */
import { encryptJson, decryptJson } from "./encrypted-cookie";

// 32 bytes of zeros, base64'd
const TEST_KEY = Buffer.alloc(32).toString("base64");

describe("encrypted-cookie", () => {
  const originalKey = process.env.PROXY_CREDS_COOKIE_KEY;

  beforeAll(() => {
    process.env.PROXY_CREDS_COOKIE_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.PROXY_CREDS_COOKIE_KEY;
    } else {
      process.env.PROXY_CREDS_COOKIE_KEY = originalKey;
    }
  });

  test("round-trips a JSON value", async () => {
    const value = { accessKeyId: "A", secretAccessKey: "S", sessionToken: "T", expiration: "2026-05-21T00:00:00Z" };
    const token = await encryptJson(value);
    expect(typeof token).toBe("string");
    expect(token).not.toContain("accessKey");
    const decrypted = await decryptJson<typeof value>(token);
    expect(decrypted).toEqual(value);
  });

  test("produces different ciphertext for the same input (random IV)", async () => {
    const a = await encryptJson({ x: 1 });
    const b = await encryptJson({ x: 1 });
    expect(a).not.toBe(b);
  });

  test("returns null on tampered ciphertext", async () => {
    const token = await encryptJson({ x: 1 });
    // Flip a byte near the end (in the auth tag region) by altering base64
    const tampered = token.slice(0, -4) + (token.endsWith("A") ? "B" : "A") + token.slice(-3);
    expect(await decryptJson(tampered)).toBeNull();
  });

  test("returns null on malformed input", async () => {
    expect(await decryptJson("not-base64-$$$$")).toBeNull();
    expect(await decryptJson("")).toBeNull();
  });
});
