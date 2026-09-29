import { createHash } from "crypto";
import { issueApiKey, revokeApiKey, setApiKeyExpiry } from "./service-account-keys";
import { serviceAccountKeysTable } from "../clients";
import { getPageSession } from "../api/utils";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { API_KEY_PATTERN, AccountType, type Account, type ApiKeyActionState, type UserSession } from "@/types";

jest.mock("../clients", () => ({
  serviceAccountKeysTable: { create: jest.fn(), listByAccount: jest.fn(), set: jest.fn() },
}));
jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/accounts/service-accounts", () => ({ managedServiceAccount: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const keys = serviceAccountKeysTable as jest.Mocked<typeof serviceAccountKeysTable>;
const managed = managedServiceAccount as jest.MockedFunction<typeof managedServiceAccount>;

const IDLE: ApiKeyActionState = { message: "", success: false };
const bot = {
  account_id: "acme--nightly-sync",
  type: AccountType.SERVICE,
  owner_account_id: "acme",
} as unknown as Account;
const session = {
  identity_id: "ory-alice",
  account: { account_id: "alice", type: AccountType.INDIVIDUAL },
} as UserSession;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

beforeEach(() => {
  jest.clearAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
  managed.mockResolvedValue(bot as never);
  keys.create.mockImplementation(async (k) => k);
});

describe("issueApiKey", () => {
  it("stores only the key's hash and returns the key once", async () => {
    const result = await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "HPC", expires_in_days: "90" }));
    expect(result.success).toBe(true);
    const key = result.issued!.key;
    expect(key).toMatch(API_KEY_PATTERN);
    const stored = keys.create.mock.calls[0][0];
    expect(stored).toMatchObject({ key_hash: sha256(key), account_id: "acme--nightly-sync", label: "HPC", created_by: "alice" });
    expect(stored.expires_at).not.toBeNull();
    expect(JSON.stringify(stored)).not.toContain(key);
    // The record handed back is the public one: no hash, and the same handle.
    expect(result.issued!.record).not.toHaveProperty("key_hash");
    expect(result.issued!.record.key_id).toBe(stored.key_id);
  });

  it("issues a different key every time", async () => {
    const a = await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "a" }));
    const b = await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "b" }));
    expect(a.issued!.key).not.toBe(b.issued!.key);
  });

  it("issues a key with no expiry when asked", async () => {
    const result = await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "forever", expires_in_days: "" }));
    expect(result.success).toBe(true);
    expect(keys.create.mock.calls[0][0].expires_at).toBeNull();
  });

  it("refuses a disabled service account, even to its manager", async () => {
    managed.mockResolvedValue({ ...bot, disabled: true } as never);
    const result = await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "HPC", expires_in_days: "90" }));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/disabled/);
    expect(keys.create).not.toHaveBeenCalled();
  });

  it("refuses a non-manager, a bad label, and a bad expiry before writing anything", async () => {
    managed.mockResolvedValueOnce(null);
    expect((await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "HPC" }))).success).toBe(false);
    expect((await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "" }))).success).toBe(false);
    expect((await issueApiKey(IDLE, form({ account_id: "acme--nightly-sync", label: "x", expires_in_days: "0" }))).success).toBe(false);
    expect(keys.create).not.toHaveBeenCalled();
  });
});

describe("revokeApiKey and setApiKeyExpiry", () => {
  const record = { key_hash: "h1", key_id: "k1", account_id: "acme--nightly-sync", label: "HPC", expires_at: null } as never;

  it("revokes only a key on a service account the caller manages", async () => {
    keys.listByAccount.mockResolvedValue([record]);
    expect((await revokeApiKey(IDLE, form({ account_id: "acme--nightly-sync", key_id: "k1" }))).success).toBe(true);
    expect(keys.set).toHaveBeenCalledWith("h1", "revoked_at", expect.any(String));

    // A key the account does not hold is not found, whatever id is given.
    keys.listByAccount.mockResolvedValue([]);
    expect((await revokeApiKey(IDLE, form({ account_id: "acme--nightly-sync", key_id: "k1" }))).success).toBe(false);
  });

  it("changes expiry after issuance, including to never", async () => {
    keys.listByAccount.mockResolvedValue([record]);
    await setApiKeyExpiry(IDLE, form({ account_id: "acme--nightly-sync", key_id: "k1", expires_in_days: "30" }));
    expect(keys.set).toHaveBeenCalledWith("h1", "expires_at", expect.any(String));
    await setApiKeyExpiry(IDLE, form({ account_id: "acme--nightly-sync", key_id: "k1", expires_in_days: "" }));
    expect(keys.set).toHaveBeenLastCalledWith("h1", "expires_at", null);
  });
});
