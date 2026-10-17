import { createHash } from "crypto";
import { AccountType, isApiKey, MembershipRole, type Account, type UserSession } from "@/types";
import {
  accountsTable,
  accountTrustsTable,
  productsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { canManageAccountServiceAccounts, isAuthorized } from "@/lib/api/authz";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import {
  createServiceAccount,
  issueKey,
  listKeys,
  updateKey,
  listServiceAccounts,
  listTrusts,
  removeTrust,
} from "./service-accounts";
import { inviteMember } from "./memberships";
import { ok } from "./result";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn(), create: jest.fn(), listByOwner: jest.fn() },
  productsTable: { fetchById: jest.fn() },
  accountTrustsTable: { create: jest.fn(), delete: jest.fn(), listByAccount: jest.fn() },
  serviceAccountKeysTable: { create: jest.fn(), listByAccount: jest.fn(), set: jest.fn(), revoke: jest.fn() },
}));
jest.mock("@/lib/api/authz", () => ({
  canManageAccountServiceAccounts: jest.fn(),
  isAuthorized: jest.fn(),
}));
jest.mock("@/lib/accounts/service-accounts", () => ({ managedServiceAccount: jest.fn() }));
jest.mock("./memberships");

const accounts = accountsTable as jest.Mocked<typeof accountsTable>;
const trusts = accountTrustsTable as jest.Mocked<typeof accountTrustsTable>;
const canManage = canManageAccountServiceAccounts as jest.Mock;
const managed = managedServiceAccount as jest.Mock;
const keys = serviceAccountKeysTable as jest.Mocked<typeof serviceAccountKeysTable>;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const org = { account_id: "acme", type: AccountType.ORGANIZATION } as Account;
const bot = { account_id: "acme--sync", type: AccountType.SERVICE, owner_account_id: "acme" } as Account;
const session = { identity_id: "id", account: { account_id: "a-person" } } as UserSession;

beforeEach(() => {
  jest.resetAllMocks();
  canManage.mockReturnValue(true);
  (isAuthorized as jest.Mock).mockReturnValue(true);
  managed.mockResolvedValue(bot);
  accounts.fetchById.mockImplementation(async (id) => (id === "acme" ? org : null));
  accounts.create.mockImplementation(async (a) => a);
  (productsTable.fetchById as jest.Mock).mockResolvedValue({ product_id: "p" });
  trusts.create.mockImplementation(async (t) => t);
  (inviteMember as jest.Mock).mockResolvedValue(ok({}));
});

describe("listServiceAccounts", () => {
  it("lists the owner's service accounts to whoever manages them", async () => {
    accounts.listByOwner.mockResolvedValue([bot as never]);
    expect(await listServiceAccounts(session, "acme")).toEqual({
      ok: true,
      value: { items: [bot], next_cursor: null },
    });
  });

  it("refuses everyone else, and says when the owner doesn't exist", async () => {
    expect(await listServiceAccounts(session, "nobody")).toMatchObject({ error: "not_found" });
    canManage.mockReturnValue(false);
    expect(await listServiceAccounts(session, "acme")).toMatchObject({ error: "forbidden" });
    expect(await listServiceAccounts(null, "acme")).toMatchObject({ error: "unauthenticated" });
    expect(accounts.listByOwner).not.toHaveBeenCalled();
  });
});

describe("createServiceAccount", () => {
  it("takes subjects and grants as JSON, once each", async () => {
    const grant = { product_id: "p", role: MembershipRole.ReadData };
    const subject = "repo:acme/data:ref:refs/heads/main";
    const created = await createServiceAccount(session, "acme", {
      local_id: "Sync",
      name: "Sync",
      github_subjects: [subject, subject],
      grants: [grant, grant],
    });
    expect(created).toMatchObject({ ok: true, value: { account_id: "acme--sync" } });
    expect(inviteMember).toHaveBeenCalledTimes(1);
    expect(inviteMember).toHaveBeenCalledWith(session, {
      account_id: "acme--sync",
      membership_account_id: "acme",
      product_id: "p",
      role: MembershipRole.ReadData,
    });
    expect(trusts.create).toHaveBeenCalledTimes(1);
  });

  it("issues a key asked for with the account, and returns it once", async () => {
    const created = await createServiceAccount(session, "acme", {
      local_id: "sync",
      name: "Sync",
      key: { label: "HPC", expires_at: null },
    });
    expect(created.ok && created.value.key).toMatchObject({ account_id: "acme--sync", label: "HPC" });
    const key = created.ok ? created.value.key!.key : "";
    expect(keys.create).toHaveBeenCalledWith(expect.objectContaining({ key_hash: sha256(key) }));
  });

  it("writes nothing when a grant would be refused, or the key asked for is bad", async () => {
    expect(
      await createServiceAccount(session, "acme", {
        local_id: "sync",
        name: "Sync",
        key: { label: " ", expires_at: null },
      })
    ).toMatchObject({ error: "invalid", fieldErrors: { "key.label": expect.any(Array) } });
    (isAuthorized as jest.Mock).mockReturnValueOnce(false);
    expect(
      await createServiceAccount(session, "acme", {
        local_id: "sync",
        name: "Sync",
        grants: [{ product_id: "p", role: MembershipRole.ReadData }],
      })
    ).toMatchObject({ error: "forbidden" });
    expect(accounts.create).not.toHaveBeenCalled();
    expect(inviteMember).not.toHaveBeenCalled();
  });

  it("refuses a role beyond read or write, and an id that's taken", async () => {
    expect(
      await createServiceAccount(session, "acme", {
        local_id: "sync",
        name: "Sync",
        grants: [{ product_id: "p", role: MembershipRole.Owners }],
      })
    ).toMatchObject({ error: "invalid" });
    accounts.create.mockRejectedValue(
      Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" })
    );
    expect(
      await createServiceAccount(session, "acme", { local_id: "sync", name: "Sync" })
    ).toMatchObject({ error: "conflict", fieldErrors: { local_id: expect.any(Array) } });
  });
});

describe("trusts", () => {
  it("answers not found for an account the caller doesn't manage, without saying why", async () => {
    managed.mockResolvedValue(null);
    expect(await listTrusts(session, "acme--sync")).toMatchObject({ error: "not_found" });
    expect(await listTrusts(null, "acme--sync")).toMatchObject({ error: "unauthenticated" });
    expect(trusts.listByAccount).not.toHaveBeenCalled();
  });

  const trust = {
    account_id: "acme--sync",
    issuer: "i",
    subject: "s",
    created_at: "2026-01-01T00:00:00.000Z",
    created_by: "a-person",
  };

  it("lists trusts without the table's own key", async () => {
    trusts.listByAccount.mockResolvedValue([{ ...trust, identity: "i s" } as never]);
    expect(await listTrusts(session, "acme--sync")).toEqual({
      ok: true,
      value: { items: [trust], next_cursor: null },
    });
  });

  it("removes only a trust the account has, and returns it", async () => {
    trusts.listByAccount.mockResolvedValue([{ ...trust, identity: "i s" } as never]);
    expect(await removeTrust(session, "acme--sync", { issuer: "i", subject: "other" })).toMatchObject({
      error: "not_found",
    });
    expect(trusts.delete).not.toHaveBeenCalled();
    expect(await removeTrust(session, "acme--sync", { issuer: "i", subject: "s" })).toEqual({
      ok: true,
      value: trust,
    });
    expect(trusts.delete).toHaveBeenCalledWith("acme--sync", "i", "s");
  });
});

describe("keys", () => {
  const record = {
    key_hash: "h1",
    key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
    account_id: "acme--sync",
    label: "HPC",
    expires_at: null,
  } as never;

  it("stores only a new key's hash, and returns the key once with its public record", async () => {
    const issued = await issueKey(session, "acme--sync", { label: "HPC", expires_at: inDays(90) });
    if (!issued.ok) throw new Error(issued.message);
    const { key, ...rest } = issued.value;
    expect(isApiKey(key)).toBe(true);
    const stored = keys.create.mock.calls[0][0];
    expect(stored).toMatchObject({ key_hash: sha256(key), account_id: "acme--sync", label: "HPC", created_by: "a-person" });
    // The checksum, the last six characters and only those, so the key can be recognised later.
    expect(stored.hint).toBe(key.slice(-6));
    expect(JSON.stringify(stored)).not.toContain(key);
    expect(rest).not.toHaveProperty("key_hash");
    expect(rest.key_id).toBe(stored.key_id);

    const again = await issueKey(session, "acme--sync", { label: "HPC", expires_at: null });
    expect(again.ok && again.value.key).not.toBe(key);
  });

  it("refuses a disabled account, a non-manager, a bad label and an expiry out of range, writing nothing", async () => {
    managed.mockResolvedValueOnce({ ...bot, disabled: true });
    expect(await issueKey(session, "acme--sync", { label: "x", expires_at: null })).toMatchObject({ error: "conflict" });
    managed.mockResolvedValueOnce(null);
    expect(await issueKey(session, "acme--sync", { label: "x", expires_at: null })).toMatchObject({ error: "not_found" });
    for (const input of [
      { label: "", expires_at: null },
      { label: "x".repeat(65), expires_at: null },
      { label: "x", expires_at: inDays(-1) },
      { label: "x", expires_at: inDays(3651) },
      { label: "x" },
    ]) {
      expect(await issueKey(session, "acme--sync", input)).toMatchObject({ error: "invalid" });
    }
    expect(keys.create).not.toHaveBeenCalled();
  });

  it("lists keys without their hashes", async () => {
    keys.listByAccount.mockResolvedValue([record]);
    const listed = await listKeys(session, "acme--sync");
    expect(listed).toMatchObject({ ok: true, value: { next_cursor: null } });
    expect(listed.ok && listed.value.items[0]).not.toHaveProperty("key_hash");
  });

  it("revokes a key in the name of the signed-in person, once", async () => {
    keys.listByAccount.mockResolvedValue([record]);
    const revoked = await updateKey(session, "acme--sync", "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b", { revoked: true });
    expect(revoked).toMatchObject({ ok: true, value: { revoked_via: "owner", revoked_by: "a-person" } });
    expect(keys.revoke).toHaveBeenCalledWith("h1", "owner", "a-person");
    keys.listByAccount.mockResolvedValue([{ ...(record as object), revoked_at: inDays(-1) } as never]);
    expect(
      await updateKey(session, "acme--sync", "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b", { revoked: true })
    ).toMatchObject({ error: "conflict" });
    expect(await updateKey(session, "acme--sync", "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b", { revoked: false })).toMatchObject({
      error: "invalid",
    });
  });

  it("changes expiry, including to never, and finds only the account's own keys", async () => {
    keys.listByAccount.mockResolvedValue([record]);
    const at = inDays(30);
    await updateKey(session, "acme--sync", "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b", { expires_at: at });
    expect(keys.set).toHaveBeenCalledWith("h1", "expires_at", at);
    await updateKey(session, "acme--sync", "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b", { expires_at: null });
    expect(keys.set).toHaveBeenLastCalledWith("h1", "expires_at", null);
    keys.listByAccount.mockResolvedValue([]);
    expect(await updateKey(session, "acme--sync", "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b", { revoked: true })).toMatchObject({
      error: "not_found",
    });
  });
});
