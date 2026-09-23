import { issueApiKey, revokeApiKey, setApiKeyExpiry } from "./service-account-keys";
import { accountsTable, serviceAccountKeysTable } from "../clients";
import { getPageSession } from "../api/utils";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { mintApiKey } from "@/lib/services/proxy-keys";
import { AccountType, type Account, type ApiKeyActionState, type UserSession } from "@/types";

jest.mock("../clients", () => ({
  accountsTable: { fetchByOryId: jest.fn() },
  serviceAccountKeysTable: { create: jest.fn(), delete: jest.fn(), fetchByJti: jest.fn(), set: jest.fn() },
}));
jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/accounts/service-accounts", () => ({ managedServiceAccount: jest.fn() }));
jest.mock("@/lib/services/proxy-keys", () => ({ mintApiKey: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const accounts = accountsTable as jest.Mocked<typeof accountsTable>;
const keys = serviceAccountKeysTable as jest.Mocked<typeof serviceAccountKeysTable>;
const managed = managedServiceAccount as jest.MockedFunction<typeof managedServiceAccount>;
const mint = mintApiKey as jest.MockedFunction<typeof mintApiKey>;

const IDLE: ApiKeyActionState = { message: "", success: false };
const bot = {
  account_id: "nightly-sync",
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

beforeEach(() => {
  jest.clearAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
  managed.mockResolvedValue(bot as never);
  accounts.fetchByOryId.mockResolvedValue(null);
  keys.create.mockImplementation(async (k) => k);
  mint.mockResolvedValue("sck_eyJ.signed.key");
});

describe("issueApiKey", () => {
  it("records the key, has the proxy sign it, and returns it once", async () => {
    const result = await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "HPC", expires_in_days: "90" }));
    expect(result.success).toBe(true);
    expect(result.issued?.key).toBe("sck_eyJ.signed.key");
    const record = keys.create.mock.calls[0][0];
    expect(record).toMatchObject({ account_id: "nightly-sync", label: "HPC", created_by: "alice" });
    expect(record.expires_at).not.toBeNull();
    expect(mint).toHaveBeenCalledWith("ory-alice", { account_id: "nightly-sync", jti: record.jti, expires_at: record.expires_at });
  });

  it("issues a key with no expiry when asked", async () => {
    const result = await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "forever", expires_in_days: "" }));
    expect(result.success).toBe(true);
    expect(keys.create.mock.calls[0][0].expires_at).toBeNull();
  });

  it("removes the record when the proxy will not sign, so no row looks like a live key", async () => {
    mint.mockRejectedValue(new Error("502"));
    const result = await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "HPC" }));
    expect(result.success).toBe(false);
    expect(keys.delete).toHaveBeenCalledWith(keys.create.mock.calls[0][0].jti);
  });

  it("refuses a disabled service account, even to its manager", async () => {
    managed.mockResolvedValue({ ...bot, disabled: true } as never);
    const result = await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "HPC", expires_in_days: "90" }));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/disabled/);
    expect(keys.create).not.toHaveBeenCalled();
  });

  it("refuses an account whose id is someone's Ory identity id, before binding or writing", async () => {
    // A key's subject reaches the API bare, and Ory is tried first: the key
    // would act as that person.
    accounts.fetchByOryId.mockResolvedValue({ account_id: "alice" } as never);
    const result = await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "HPC", expires_in_days: "90" }));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/sign-in identity/);
    expect(keys.create).not.toHaveBeenCalled();
    expect(mint).not.toHaveBeenCalled();
  });

  it("refuses a non-manager, a bad label, and a bad expiry before writing anything", async () => {
    managed.mockResolvedValueOnce(null);
    expect((await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "HPC" }))).success).toBe(false);
    expect((await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "" }))).success).toBe(false);
    expect((await issueApiKey(IDLE, form({ account_id: "nightly-sync", label: "x", expires_in_days: "0" }))).success).toBe(false);
    expect(keys.create).not.toHaveBeenCalled();
    expect(mint).not.toHaveBeenCalled();
  });
});

describe("revokeApiKey and setApiKeyExpiry", () => {
  const record = { jti: "j1", account_id: "nightly-sync", label: "HPC", expires_at: null } as never;

  it("revokes only a key on a service account the caller manages", async () => {
    keys.fetchByJti.mockResolvedValue(record);
    expect((await revokeApiKey(IDLE, form({ account_id: "nightly-sync", jti: "j1" }))).success).toBe(true);
    expect(keys.set).toHaveBeenCalledWith("j1", "revoked_at", expect.any(String));

    keys.fetchByJti.mockResolvedValue({ ...(record as object), account_id: "other" } as never);
    expect((await revokeApiKey(IDLE, form({ account_id: "nightly-sync", jti: "j1" }))).success).toBe(false);
  });

  it("changes expiry after issuance, including to never", async () => {
    keys.fetchByJti.mockResolvedValue(record);
    await setApiKeyExpiry(IDLE, form({ account_id: "nightly-sync", jti: "j1", expires_in_days: "30" }));
    expect(keys.set).toHaveBeenCalledWith("j1", "expires_at", expect.any(String));
    await setApiKeyExpiry(IDLE, form({ account_id: "nightly-sync", jti: "j1", expires_in_days: "" }));
    expect(keys.set).toHaveBeenLastCalledWith("j1", "expires_at", null);
  });
});
