import "server-only";

import { CONFIG } from "@/lib/config";

const ALGO = "AES-GCM";
const IV_LEN = 12;

// Cache the resolved key, not the import promise: caching a rejected promise
// would make every later call fail permanently with the original error.
let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = CONFIG.proxyCredentialsCookieKey;
  if (!raw) {
    throw new Error(
      "PROXY_CREDS_COOKIE_KEY is not set. Generate with `openssl rand -base64 32`.",
    );
  }
  const keyBytes = fromBase64(raw);
  if (keyBytes.byteLength !== 32) {
    throw new Error("PROXY_CREDS_COOKIE_KEY must decode to 32 bytes");
  }
  cachedKey = await crypto.subtle.importKey("raw", keyBytes, ALGO, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

// This module is server-only, so Buffer is always available — no need to
// hand-roll base64 over atob/btoa for browser compatibility.
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

export async function encryptJson(value: unknown): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALGO, iv }, key, plaintext),
  );
  const out = new Uint8Array(IV_LEN + ciphertext.byteLength);
  out.set(iv, 0);
  out.set(ciphertext, IV_LEN);
  return toBase64(out);
}

export async function decryptJson<T>(token: string): Promise<T | null> {
  try {
    const key = await getKey();
    const raw = fromBase64(token);
    if (raw.byteLength <= IV_LEN) return null;
    const iv = raw.slice(0, IV_LEN);
    const ciphertext = raw.slice(IV_LEN);
    const plaintext = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}
