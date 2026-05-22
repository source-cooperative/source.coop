import "server-only";

const ALGO = "AES-GCM";
const IV_LEN = 12;

let cachedKey: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = process.env.PROXY_CREDS_COOKIE_KEY;
  if (!raw) {
    throw new Error(
      "PROXY_CREDS_COOKIE_KEY is not set. Generate with `openssl rand -base64 32`.",
    );
  }
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (keyBytes.byteLength !== 32) {
    throw new Error("PROXY_CREDS_COOKIE_KEY must decode to 32 bytes");
  }
  cachedKey = crypto.subtle.importKey("raw", keyBytes, ALGO, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
