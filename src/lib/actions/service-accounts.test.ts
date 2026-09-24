import {
  addGithubTrust,
  grantProduct,
  revokeGrant,
  setGrantRole,
  createServiceAccount,
  deleteServiceAccount,
  removeTrust,
  setServiceAccountDisabled,
} from "./service-accounts";
import {
  accountTrustsTable,
  accountsTable,
  membershipsTable,
  productsTable,
} from "../clients";
import { getPageSession } from "../api/utils";
import { redirect } from "next/navigation";
import { canManageAccount } from "../api/authz";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { AlreadyTrustedError } from "../clients/database/account-trusts";
import {
  AccountType,
  MembershipRole,
  MembershipState,
  type Account,
  type ServiceAccountActionState,
  type ServiceAccountFormState,
  type UserSession,
} from "@/types";

jest.mock("../clients", () => ({
  accountsTable: { fetchById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  membershipsTable: {
    create: jest.fn(),
    listByUser: jest.fn(),
    delete: jest.fn(),
    fetchById: jest.fn(),
    update: jest.fn(),
  },
  productsTable: { fetchById: jest.fn() },
  accountTrustsTable: { create: jest.fn(), delete: jest.fn() },
}));
jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("../api/authz", () => ({ canManageAccount: jest.fn() }));
jest.mock("@/lib/accounts/service-accounts", () => ({
  managedServiceAccount: jest.fn(),
  serviceAccountGrantProblem: jest.requireActual("@/lib/accounts/service-accounts")
    .serviceAccountGrantProblem,
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

const mocks = {
  accounts: accountsTable as jest.Mocked<typeof accountsTable>,
  memberships: membershipsTable as jest.Mocked<typeof membershipsTable>,
  products: productsTable as jest.Mocked<typeof productsTable>,
  trusts: accountTrustsTable as jest.Mocked<typeof accountTrustsTable>,
  session: getPageSession as jest.MockedFunction<typeof getPageSession>,
  canManageAccount: canManageAccount as jest.MockedFunction<typeof canManageAccount>,
  managed: managedServiceAccount as jest.MockedFunction<typeof managedServiceAccount>,
};

const IDLE_FORM: ServiceAccountFormState = { fieldErrors: {}, message: "", success: false };
const IDLE: ServiceAccountActionState = { message: "", success: false };
const bot = {
  account_id: "acme--nightly-sync",
  type: AccountType.SERVICE,
  owner_account_id: "acme",
  name: "Nightly Sync",
  disabled: false,
  flags: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  metadata_public: {},
} as unknown as Account;
const org = { account_id: "acme", type: AccountType.ORGANIZATION, disabled: false } as unknown as Account;

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
};

beforeEach(() => {
  jest.clearAllMocks();
  mocks.session.mockResolvedValue({ identity_id: "an-identity", account: { account_id: "acme-owner" } } as UserSession);
  mocks.trusts.create.mockImplementation(async (t) => t);
  mocks.canManageAccount.mockReturnValue(true);
  mocks.accounts.fetchById.mockImplementation(async (id) => (id === "acme" ? org : null));
  mocks.accounts.create.mockImplementation(async (a) => a);
  mocks.products.fetchById.mockImplementation(async (owner, id) =>
    owner === "acme" && ["climate-data", "reference-data"].includes(id) ? ({ product_id: id } as never) : null
  );
});

describe("createServiceAccount", () => {
  const base = { owner_account_id: "acme", name: "Nightly Sync", local_id: "nightly-sync" };

  it("creates the account, grants the products as a member, trusts each workflow — once each — and goes to its page", async () => {
    const data = form({
      ...base,
      github_subject: ["repo:acme/data:ref:refs/heads/main", "repo:acme/data:environment:prod"],
      "grant:climate-data": MembershipRole.WriteData,
      "grant:reference-data": MembershipRole.ReadData,
    });
    // A workflow card or a grant field left in twice is one trust, one membership.
    data.append("github_subject", "repo:acme/data:ref:refs/heads/main");
    data.append("grant:climate-data", MembershipRole.WriteData);
    await createServiceAccount(IDLE_FORM, data);
    expect(redirect).toHaveBeenCalledWith("/edit/account/acme/service-accounts/acme--nightly-sync");
    expect(mocks.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: "acme--nightly-sync", type: AccountType.SERVICE, owner_account_id: "acme" })
    );
    expect(mocks.memberships.create).toHaveBeenCalledTimes(2);
    expect(mocks.memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: "acme--nightly-sync",
        membership_account_id: "acme",
        repository_id: "climate-data",
        role: MembershipRole.WriteData,
        state: MembershipState.Member,
      })
    );
    expect(mocks.trusts.create).toHaveBeenCalledTimes(2);
    expect(mocks.trusts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: "acme--nightly-sync",
        issuer: "https://token.actions.githubusercontent.com",
        subject: "repo:acme/data:ref:refs/heads/main",
        created_by: "acme-owner",
      })
    );
  });

  it("refuses an unpinned workflow, a product the owner does not have, a bad role, and a short id with its own `--` — before writing anything", async () => {
    for (const fields of [
      { ...base, local_id: "nightly--sync" },
      { ...base, github_subject: "repo:acme/*" },
      { ...base, "grant:not-ours": MembershipRole.ReadData },
      { ...base, "grant:climate-data": MembershipRole.Owners },
    ]) {
      expect((await createServiceAccount(IDLE_FORM, form(fields))).success).toBe(false);
    }
    expect(mocks.accounts.create).not.toHaveBeenCalled();
  });

  it("refuses someone who does not manage the owner, an owner that is missing or a service account, and reports a taken id on the field", async () => {
    mocks.canManageAccount.mockReturnValue(false);
    const denied = await createServiceAccount(
      IDLE_FORM,
      form({ ...base, "grant:climate-data": MembershipRole.ReadData })
    );
    expect(denied.success).toBe(false);
    // ...and learns nothing about the owner's products on the way out.
    expect(mocks.products.fetchById).not.toHaveBeenCalled();

    mocks.canManageAccount.mockReturnValue(true);
    expect((await createServiceAccount(IDLE_FORM, form({ ...base, owner_account_id: "nobody" }))).success).toBe(false);
    mocks.accounts.fetchById.mockResolvedValue(bot);
    expect((await createServiceAccount(IDLE_FORM, form({ ...base, owner_account_id: "acme--nightly-sync" }))).message).toMatch(/cannot own/);
    expect(mocks.accounts.create).not.toHaveBeenCalled();

    mocks.accounts.fetchById.mockResolvedValue(org);
    mocks.accounts.create.mockRejectedValue(Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" }));
    const taken = await createServiceAccount(IDLE_FORM, form(base));
    expect(taken.success).toBe(false);
    expect(taken.fieldErrors.local_id).toBeDefined();
  });
});

describe("lifecycle", () => {
  beforeEach(() => {
    mocks.managed.mockResolvedValue(bot as never);
  });

  it("deletes grants, then the account (whose trusts go with it), and returns to the list", async () => {
    mocks.memberships.listByUser.mockResolvedValue([
      { membership_id: "m1" } as never,
      { membership_id: "m2" } as never,
    ]);
    await deleteServiceAccount(IDLE, form({ account_id: "acme--nightly-sync" }));
    expect(redirect).toHaveBeenCalledWith("/edit/account/acme/service-accounts");
    expect(mocks.memberships.delete).toHaveBeenCalledTimes(2);
    expect(mocks.accounts.delete).toHaveBeenCalledWith("acme--nightly-sync");
  });

  it("disables and enables", async () => {
    await setServiceAccountDisabled(IDLE, form({ account_id: "acme--nightly-sync", disabled: "true" }));
    expect(mocks.accounts.update).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it("removes a trust by the account's own key, so no other account's can be touched", async () => {
    expect((await removeTrust(IDLE, form({ account_id: "acme--nightly-sync", issuer: "i", subject: "s" }))).success).toBe(true);
    expect(mocks.trusts.delete).toHaveBeenCalledWith("acme--nightly-sync", "i", "s");
  });

  it("trusts one more workflow, refusing an unpinned subject, a repeat, and a disabled account", async () => {
    const ok = await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }));
    expect(ok.success).toBe(true);
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/*" }))).success).toBe(false);
    // GitHub's immutable form carries ids on both owner and repository; a mix is not a form GitHub mints.
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme@123456/data@456789:ref:refs/heads/main" }))).success).toBe(true);
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme@123456/data:ref:refs/heads/main" }))).success).toBe(false);
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data@456789:ref:refs/heads/main" }))).success).toBe(false);
    // An environment name may contain a space; a ref may not.
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data:environment:Production Approval" }))).success).toBe(true);
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data:ref:refs/heads/my branch" }))).success).toBe(false);

    mocks.trusts.create.mockRejectedValueOnce(new AlreadyTrustedError("acme--nightly-sync", "i", "s"));
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }))).message).toMatch(/Already trusted/);

    mocks.managed.mockResolvedValue({ ...bot, disabled: true } as never);
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }))).message).toMatch(/disabled/);
  });

  it("refuses whatever managedServiceAccount does not hand back", async () => {
    mocks.managed.mockResolvedValue(null);
    expect((await deleteServiceAccount(IDLE, form({ account_id: "acme--nightly-sync" }))).success).toBe(false);
    expect((await addGithubTrust(IDLE, form({ account_id: "acme--nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }))).success).toBe(false);
    expect(mocks.accounts.delete).not.toHaveBeenCalled();
    expect(mocks.trusts.create).not.toHaveBeenCalled();
  });
});

describe("grants from the account's page", () => {
  const grant = {
    membership_id: "m1",
    account_id: "acme--nightly-sync",
    membership_account_id: "acme",
    repository_id: "climate-data",
    role: MembershipRole.ReadData,
    state: MembershipState.Member,
    state_changed: "2026-01-01T00:00:00.000Z",
  };
  beforeEach(() => {
    mocks.managed.mockResolvedValue(bot as never);
    mocks.memberships.listByUser.mockResolvedValue([]);
    mocks.memberships.fetchById.mockResolvedValue(grant as never);
  });

  it("grants one of the owner's products as a member, and only once", async () => {
    const ok = await grantProduct(IDLE, form({ account_id: "acme--nightly-sync", product_id: "reference-data", role: MembershipRole.WriteData }));
    expect(ok.success).toBe(true);
    expect(mocks.memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: "acme--nightly-sync",
        membership_account_id: "acme",
        repository_id: "reference-data",
        role: MembershipRole.WriteData,
        state: MembershipState.Member,
      })
    );
    mocks.memberships.listByUser.mockResolvedValue([grant as never]);
    expect((await grantProduct(IDLE, form({ account_id: "acme--nightly-sync", product_id: "climate-data", role: MembershipRole.ReadData }))).success).toBe(false);
  });

  it("refuses a product the owner lacks, a role beyond read or write, and someone who does not manage it", async () => {
    expect((await grantProduct(IDLE, form({ account_id: "acme--nightly-sync", product_id: "not-ours", role: MembershipRole.ReadData }))).success).toBe(false);
    expect((await grantProduct(IDLE, form({ account_id: "acme--nightly-sync", product_id: "climate-data", role: MembershipRole.Owners }))).success).toBe(false);
    mocks.managed.mockResolvedValue(null);
    expect((await grantProduct(IDLE, form({ account_id: "acme--nightly-sync", product_id: "climate-data", role: MembershipRole.ReadData }))).success).toBe(false);
    expect(mocks.memberships.create).not.toHaveBeenCalled();
  });

  it("changes a grant's access and revokes it, but only its own grants", async () => {
    expect((await setGrantRole(IDLE, form({ account_id: "acme--nightly-sync", membership_id: "m1", role: MembershipRole.WriteData }))).success).toBe(true);
    expect(mocks.memberships.update).toHaveBeenLastCalledWith(expect.objectContaining({ membership_id: "m1", role: MembershipRole.WriteData }));
    expect((await setGrantRole(IDLE, form({ account_id: "acme--nightly-sync", membership_id: "m1", role: MembershipRole.Maintainers }))).success).toBe(false);

    expect((await revokeGrant(IDLE, form({ account_id: "acme--nightly-sync", membership_id: "m1" }))).success).toBe(true);
    expect(mocks.memberships.update).toHaveBeenLastCalledWith(expect.objectContaining({ membership_id: "m1", state: MembershipState.Revoked }));

    mocks.memberships.update.mockClear();
    mocks.memberships.fetchById.mockResolvedValue({ ...grant, account_id: "someone-else" } as never);
    expect((await setGrantRole(IDLE, form({ account_id: "acme--nightly-sync", membership_id: "m1", role: MembershipRole.WriteData }))).success).toBe(false);
    expect((await revokeGrant(IDLE, form({ account_id: "acme--nightly-sync", membership_id: "m1" }))).success).toBe(false);
    expect(mocks.memberships.update).not.toHaveBeenCalled();
  });
});
