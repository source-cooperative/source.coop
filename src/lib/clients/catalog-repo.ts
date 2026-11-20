import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";
import { CONFIG } from "@/lib/config";

const API = "https://api.github.com";
const { repo, branch, github: app } = CONFIG.catalog;

// An installation token lasts an hour; one per warm instance is plenty.
let cached: { token: string; expires: number } | undefined;

async function github(url: string, token: string, init: RequestInit = {}) {
  return fetch(url.startsWith("http") ? url : `${API}${url}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "source.coop",
      ...(init.body && { "Content-Type": "application/json" }),
    },
  });
}

async function installationToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  if (!app.appId || !app.installationId || !app.privateKey) {
    throw new Error("Catalog editing is not configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(app.appId)
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 540)
    .sign(createPrivateKey(app.privateKey.replace(/\\n/g, "\n")));
  const response = await github(
    `/app/installations/${app.installationId}/access_tokens`,
    jwt,
    { method: "POST" }
  );
  if (!response.ok) throw new Error(`GitHub installation token: ${response.status}`);
  const { token, expires_at } = await response.json();
  cached = { token, expires: Date.parse(expires_at) };
  return token as string;
}

/** An entry's text and the blob `sha` that locks a write to it, or null if there is none. */
export async function readEntry(path: string) {
  const token = await installationToken();
  const response = await github(`/repos/${repo}/contents/${path}?ref=${branch}`, token);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub read ${path}: ${response.status}`);
  let file = await response.json();
  // Past 1 MB the contents API leaves `content` empty; the blob API has it.
  if (!file.content) {
    const blob = await github(file.git_url, token);
    if (!blob.ok) throw new Error(`GitHub read ${path}: ${blob.status}`);
    file = { ...file, content: (await blob.json()).content };
  }
  return { sha: file.sha as string, text: Buffer.from(file.content, "base64").toString("utf8") };
}

/** Commits `text` to the entry; false if it changed since `sha` was read. */
export async function writeEntry(path: string, text: string, sha: string, message: string) {
  const response = await github(`/repos/${repo}/contents/${path}`, await installationToken(), {
    method: "PUT",
    body: JSON.stringify({
      message,
      sha,
      branch,
      content: Buffer.from(text, "utf8").toString("base64"),
    }),
  });
  if (response.status === 409) return false;
  if (!response.ok) throw new Error(`GitHub write ${path}: ${response.status}`);
  return true;
}
