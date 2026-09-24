import {
  addGithubTrust,
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
import { canManageServiceAccount, isAuthorized } from "../api/authz";
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
  membershipsTable: { create: jest.fn(), listByUser: jest.fn(), delete: jest.fn() },
  productsTable: { fetchById: jest.fn() },
  accountTrustsTable: { create: jest.fn(), delete: jest.fn() },
}));
jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("../api/authz", () => ({ isAuthorized: jest.fn(), canManageServiceAccount: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mocks = {
  accounts: accountsTable as jest.Mocked<typeof accountsTable>,
  memberships: membershipsTable as jest.Mocked<typeof membershipsTable>,
  products: productsTable as jest.Mocked<typeof productsTable>,
  trusts: accountTrustsTable as jest.Mocked<typeof accountTrustsTable>,
  session: getPageSession as jest.MockedFunction<typeof getPageSession>,
  isAuthorized: isAuthorized as jest.MockedFunction<typeof isAuthorized>,
  canManage: canManageServiceAccount as jest.MockedFunction<typeof canManageServiceAccount>,
};

const IDLE_FORM: ServiceAccountFormState = { fieldErrors: {}, message: "", success: false };
const IDLE: ServiceAccountActionState = { message: "", success: false };
const bot = {
  account_id: "nightly-sync",
  type: AccountType.SERVICE,
  owner_account_id: "acme",
  name: "Nightly Sync",
  disabled: false,
  flags: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  metadata_public: {},
} as unknown as Account;

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
  mocks.isAuthorized.mockReturnValue(true);
  mocks.canManage.mockReturnValue(true);
  mocks.accounts.create.mockImplementation(async (a) => a);
  mocks.products.fetchById.mockImplementation(async (owner, id) =>
    owner === "acme" && ["climate-data", "reference-data"].includes(id) ? ({ product_id: id } as never) : null
  );
});

describe("createServiceAccount", () => {
  const base = { owner_account_id: "acme", name: "Nightly Sync", account_id: "nightly-sync" };

  it("creates the account, grants the products as a member, and trusts each workflow", async () => {
    const result = await createServiceAccount(
      IDLE_FORM,
      form({
        ...base,
        github_subject: ["repo:acme/data:ref:refs/heads/main", "repo:acme/data:environment:prod"],
        "grant:climate-data": MembershipRole.WriteData,
        "grant:reference-data": MembershipRole.ReadData,
      })
    );
    expect(result.success).toBe(true);
    expect(mocks.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: "nightly-sync", type: AccountType.SERVICE, owner_account_id: "acme" })
    );
    expect(mocks.memberships.create).toHaveBeenCalledTimes(2);
    expect(mocks.memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: "nightly-sync",
        membership_account_id: "acme",
        repository_id: "climate-data",
        role: MembershipRole.WriteData,
        state: MembershipState.Member,
      })
    );
    expect(mocks.trusts.create).toHaveBeenCalledTimes(2);
    expect(mocks.trusts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: "nightly-sync",
        issuer: "https://token.actions.githubusercontent.com",
        subject: "repo:acme/data:ref:refs/heads/main",
        created_by: "acme-owner",
      })
    );
    expect(result.created?.trusts.map((t) => t.subject)).toEqual([
      "repo:acme/data:ref:refs/heads/main",
      "repo:acme/data:environment:prod",
    ]);
    // The step names the account in the role ARN; nothing in it expires.
    expect(result.created?.trusts[0].workflow_step).toContain("arn:aws:iam::nightly-sync:role/FullAccess");
  });

  it("refuses an unpinned workflow, a product the owner does not have, and a bad role — before writing anything", async () => {
    for (const fields of [
      { ...base, github_subject: "repo:acme/*" },
      { ...base, "grant:not-ours": MembershipRole.ReadData },
      { ...base, "grant:climate-data": MembershipRole.Owners },
    ]) {
      expect((await createServiceAccount(IDLE_FORM, form(fields))).success).toBe(false);
    }
    expect(mocks.accounts.create).not.toHaveBeenCalled();
  });

  it("refuses someone who does not manage the owner, and reports a taken id on the field", async () => {
    mocks.isAuthorized.mockReturnValue(false);
    const denied = await createServiceAccount(
      IDLE_FORM,
      form({ ...base, "grant:climate-data": MembershipRole.ReadData })
    );
    expect(denied.success).toBe(false);
    // ...and learns nothing about the owner's products on the way out.
    expect(mocks.products.fetchById).not.toHaveBeenCalled();

    mocks.isAuthorized.mockReturnValue(true);
    mocks.accounts.create.mockRejectedValue(Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" }));
    const taken = await createServiceAccount(IDLE_FORM, form(base));
    expect(taken.success).toBe(false);
    expect(taken.fieldErrors.account_id).toBeDefined();
  });
});

describe("lifecycle", () => {
  beforeEach(() => {
    mocks.accounts.fetchById.mockResolvedValue(bot);
  });

  it("deletes grants, then the account (whose trusts go with it)", async () => {
    mocks.memberships.listByUser.mockResolvedValue([
      { membership_id: "m1" } as never,
      { membership_id: "m2" } as never,
    ]);
    expect((await deleteServiceAccount(IDLE, form({ account_id: "nightly-sync" }))).success).toBe(true);
    expect(mocks.memberships.delete).toHaveBeenCalledTimes(2);
    expect(mocks.accounts.delete).toHaveBeenCalledWith("nightly-sync");
  });

  it("disables and enables", async () => {
    await setServiceAccountDisabled(IDLE, form({ account_id: "nightly-sync", disabled: "true" }));
    expect(mocks.accounts.update).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it("removes a trust by the account's own key, so no other account's can be touched", async () => {
    expect((await removeTrust(IDLE, form({ account_id: "nightly-sync", issuer: "i", subject: "s" }))).success).toBe(true);
    expect(mocks.trusts.delete).toHaveBeenCalledWith("nightly-sync", "i", "s");
  });

  it("trusts one more workflow, refusing an unpinned subject, a repeat, and a disabled account", async () => {
    const ok = await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }));
    expect(ok.success).toBe(true);
    expect(ok.added?.workflow_step).toContain("arn:aws:iam::nightly-sync:role/FullAccess");
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/*" }))).success).toBe(false);
    // GitHub's immutable form carries ids on both owner and repository; a mix is not a form GitHub mints.
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme@123456/data@456789:ref:refs/heads/main" }))).success).toBe(true);
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme@123456/data:ref:refs/heads/main" }))).success).toBe(false);
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/data@456789:ref:refs/heads/main" }))).success).toBe(false);
    // An environment name may contain a space; a ref may not.
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/data:environment:Production Approval" }))).success).toBe(true);
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/data:ref:refs/heads/my branch" }))).success).toBe(false);

    mocks.trusts.create.mockRejectedValueOnce(new AlreadyTrustedError("nightly-sync", "i", "s"));
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }))).message).toMatch(/Already trusted/);

    mocks.accounts.fetchById.mockResolvedValue({ ...bot, disabled: true } as Account);
    expect((await addGithubTrust(IDLE, form({ account_id: "nightly-sync", subject: "repo:acme/data:ref:refs/heads/main" }))).message).toMatch(/disabled/);
  });

  it("refuses anyone who does not manage the account, and non-service accounts", async () => {
    mocks.canManage.mockReturnValue(false);
    expect((await deleteServiceAccount(IDLE, form({ account_id: "nightly-sync" }))).success).toBe(false);
    mocks.canManage.mockReturnValue(true);
    mocks.accounts.fetchById.mockResolvedValue({ ...bot, type: AccountType.INDIVIDUAL } as Account);
    expect((await deleteServiceAccount(IDLE, form({ account_id: "nightly-sync" }))).success).toBe(false);
    expect(mocks.accounts.delete).not.toHaveBeenCalled();
  });
});
