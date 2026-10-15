import { AccountType, MembershipRole, type Account, type UserSession } from "@/types";
import {
  accountsTable,
  accountTrustsTable,
  productsTable,
} from "@/lib/clients/database";
import { canManageAccountServiceAccounts } from "@/lib/api/authz";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import {
  createServiceAccount,
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
}));
jest.mock("@/lib/api/authz", () => ({ canManageAccountServiceAccounts: jest.fn() }));
jest.mock("@/lib/accounts/service-accounts", () => ({ managedServiceAccount: jest.fn() }));
jest.mock("./memberships");

const accounts = accountsTable as jest.Mocked<typeof accountsTable>;
const trusts = accountTrustsTable as jest.Mocked<typeof accountTrustsTable>;
const canManage = canManageAccountServiceAccounts as jest.Mock;
const managed = managedServiceAccount as jest.Mock;

const org = { account_id: "acme", type: AccountType.ORGANIZATION } as Account;
const bot = { account_id: "acme--sync", type: AccountType.SERVICE, owner_account_id: "acme" } as Account;
const session = { identity_id: "id", account: { account_id: "a-person" } } as UserSession;

beforeEach(() => {
  jest.resetAllMocks();
  canManage.mockReturnValue(true);
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
      repository_id: "p",
      role: MembershipRole.ReadData,
    });
    expect(trusts.create).toHaveBeenCalledTimes(1);
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
