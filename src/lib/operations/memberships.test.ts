import {
  Account,
  AccountType,
  Membership,
  MembershipRole,
  MembershipState,
  UserSession,
} from "@/types";
import {
  accountsTable,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import {
  acceptInvitation,
  inviteMember,
  listMembers,
  listMemberships,
  rejectInvitation,
  revokeMembership,
  updateMembership,
} from "./memberships";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn() },
  productsTable: { fetchById: jest.fn() },
  membershipsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    listByAccount: jest.fn(),
    listByUser: jest.fn(),
  },
}));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const accounts = accountsTable as jest.Mocked<typeof accountsTable>;
const products = productsTable as jest.Mocked<typeof productsTable>;
const memberships = membershipsTable as jest.Mocked<typeof membershipsTable>;
const authorized = isAuthorized as jest.Mock;

const account = (overrides: Partial<Account>): Account =>
  ({
    account_id: "x",
    name: "X",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [],
    metadata_public: {},
    ...overrides,
  }) as Account;

const person = account({ account_id: "a-person" });
const org = account({ account_id: "an-org", type: AccountType.ORGANIZATION });
const otherOrg = account({ account_id: "other-org", type: AccountType.ORGANIZATION });
const bot = account({
  account_id: "an-org--bot",
  type: AccountType.SERVICE,
  owner_account_id: "an-org",
} as Partial<Account>);

const session: UserSession = { identity_id: "id", account: person };

const membership = (overrides: Partial<Membership> = {}): Membership => ({
  membership_id: "m-1",
  account_id: "a-person",
  membership_account_id: "an-org",
  role: MembershipRole.ReadData,
  state: MembershipState.Invited,
  state_changed: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  authorized.mockReturnValue(true);
  accounts.fetchById.mockImplementation(
    async (id) => [person, org, otherOrg, bot].find((a) => a.account_id === id) ?? null
  );
  products.fetchById.mockImplementation(async (account_id, product_id) =>
    product_id === "a-product" ? ({ account_id, product_id } as never) : null
  );
  memberships.listByAccount.mockResolvedValue([]);
  memberships.create.mockImplementation(async (m) => m);
  memberships.update.mockImplementation(async (m) => m);
});

describe("inviteMember", () => {
  const invite = (fields: object, as: UserSession | null = session) =>
    inviteMember(as, { membership_account_id: "an-org", role: "read_data", ...fields });

  it("invites a person, pending their acceptance", async () => {
    const result = await invite({ account_id: "a-person" });
    expect(result).toMatchObject({
      ok: true,
      value: { account_id: "a-person", state: MembershipState.Invited },
    });
  });

  it("grants a service account read_data on its owner's product at once", async () => {
    const result = await invite({ account_id: "an-org--bot", repository_id: "a-product" });
    expect(result).toMatchObject({
      ok: true,
      value: { repository_id: "a-product", state: MembershipState.Member },
    });
  });

  it.each([
    ["an owner role", { repository_id: "a-product", role: "owners" }],
    ["another account's product", { membership_account_id: "other-org", repository_id: "a-product" }],
    ["a whole organization", {}],
  ])("refuses a service account %s", async (_, fields) => {
    const result = await invite({ account_id: "an-org--bot", ...fields });
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(memberships.create).not.toHaveBeenCalled();
  });

  it("refuses an organization as the member", async () => {
    expect(await invite({ account_id: "other-org" })).toMatchObject({
      error: "invalid",
      fieldErrors: { account_id: ["Organizations cannot be members"] },
    });
  });

  it("refuses members for a service account", async () => {
    const result = await invite({ membership_account_id: "an-org--bot", account_id: "a-person" });
    expect(result).toMatchObject({ error: "invalid" });
  });

  it("reports a missing account, member or product", async () => {
    expect(await invite({ membership_account_id: "nobody", account_id: "a-person" })).toMatchObject({ error: "not_found" });
    expect(await invite({ repository_id: "no-product", account_id: "a-person" })).toMatchObject({ error: "not_found" });
    expect(await invite({ account_id: "nobody" })).toMatchObject({
      error: "invalid",
      fieldErrors: { account_id: ["Account nobody not found"] },
    });
  });

  it("rejects input that fails the schema with field errors", async () => {
    expect(await invite({ account_id: "a-person", role: "members" })).toMatchObject({
      error: "invalid",
      fieldErrors: { role: ["Invalid membership role"] },
    });
  });

  it("refuses an existing member or invitee", async () => {
    memberships.listByAccount.mockResolvedValue([membership({ state: MembershipState.Member })]);
    expect(await invite({ account_id: "a-person" })).toMatchObject({ error: "conflict" });
  });

  it("re-invites someone whose membership was revoked", async () => {
    memberships.listByAccount.mockResolvedValue([membership({ state: MembershipState.Revoked })]);
    expect(await invite({ account_id: "a-person" })).toMatchObject({ ok: true });
  });

  it("needs a session, then authorization", async () => {
    expect(await invite({ account_id: "a-person" }, null)).toMatchObject({ error: "unauthenticated" });
    authorized.mockReturnValue(false);
    expect(await invite({ account_id: "a-person" })).toMatchObject({ error: "forbidden" });
    expect(memberships.create).not.toHaveBeenCalled();
  });
});

describe("listMembers", () => {
  it("lists only the memberships the caller may see", async () => {
    const hidden = membership({ membership_id: "hidden" });
    memberships.listByAccount.mockResolvedValue([membership(), hidden]);
    authorized.mockImplementation((_, resource) => resource !== hidden);
    const result = await listMembers(session, { account_id: "an-org" });
    expect(result).toEqual({ ok: true, value: [membership()] });
  });

  it("scopes to a product", async () => {
    await listMembers(session, { account_id: "an-org", product_id: "a-product" });
    expect(memberships.listByAccount).toHaveBeenCalledWith("an-org", "a-product");
  });

  it("reports a missing account or product, and refusal", async () => {
    expect(await listMembers(session, { account_id: "nobody" })).toMatchObject({ error: "not_found" });
    expect(await listMembers(session, { account_id: "an-org", product_id: "nope" })).toMatchObject({ error: "not_found" });
    authorized.mockReturnValue(false);
    expect(await listMembers(session, { account_id: "an-org" })).toMatchObject({ error: "forbidden" });
    expect(await listMembers(null, { account_id: "an-org" })).toMatchObject({ error: "unauthenticated" });
  });
});

describe("listMemberships", () => {
  it("lists the caller's memberships in one state", async () => {
    memberships.listByUser.mockResolvedValue([
      membership(),
      membership({ membership_id: "m-2", state: MembershipState.Member }),
    ]);
    const result = await listMemberships(session, { state: "invited" });
    expect(result).toEqual({ ok: true, value: [membership()] });
    expect(memberships.listByUser).toHaveBeenCalledWith("a-person");
  });

  it("rejects an unknown state, and needs a session", async () => {
    expect(await listMemberships(session, { state: "pending" })).toMatchObject({ error: "invalid" });
    expect(await listMemberships(null, {})).toMatchObject({ error: "unauthenticated" });
  });
});

describe.each([
  ["acceptInvitation", acceptInvitation, MembershipState.Member],
  ["rejectInvitation", rejectInvitation, MembershipState.Revoked],
])("%s", (_, respond, outcome) => {
  it("answers a pending invitation", async () => {
    memberships.fetchById.mockResolvedValue(membership());
    const result = await respond(session, "m-1");
    expect(result).toMatchObject({ ok: true, value: { state: outcome } });
    expect(result.ok && result.value.state_changed).not.toBe(membership().state_changed);
  });

  it.each([MembershipState.Member, MembershipState.Revoked])(
    "refuses a membership that is %s",
    async (state) => {
      memberships.fetchById.mockResolvedValue(membership({ state }));
      expect(await respond(session, "m-1")).toMatchObject({ error: "conflict" });
      expect(memberships.update).not.toHaveBeenCalled();
    }
  );

  it("reports a missing membership, refusal, and no session", async () => {
    expect(await respond(session, "m-1")).toMatchObject({ error: "not_found" });
    memberships.fetchById.mockResolvedValue(membership());
    authorized.mockReturnValue(false);
    expect(await respond(session, "m-1")).toMatchObject({ error: "forbidden" });
    expect(await respond(null, "m-1")).toMatchObject({ error: "unauthenticated" });
  });
});

describe("revokeMembership", () => {
  it("revokes a membership or an invitation", async () => {
    for (const state of [MembershipState.Member, MembershipState.Invited]) {
      memberships.fetchById.mockResolvedValue(membership({ state }));
      expect(await revokeMembership(session, "m-1")).toMatchObject({
        ok: true,
        value: { state: MembershipState.Revoked },
      });
    }
  });

  it("refuses one already revoked", async () => {
    memberships.fetchById.mockResolvedValue(membership({ state: MembershipState.Revoked }));
    expect(await revokeMembership(session, "m-1")).toMatchObject({ error: "conflict" });
  });
});

describe("updateMembership", () => {
  beforeEach(() =>
    memberships.fetchById.mockResolvedValue(membership({ state: MembershipState.Member }))
  );

  it("changes an active member's role", async () => {
    expect(await updateMembership(session, "m-1", { role: "maintainers" })).toMatchObject({
      ok: true,
      value: { role: MembershipRole.Maintainers },
    });
  });

  it("requires a valid role", async () => {
    expect(await updateMembership(session, "m-1", {})).toMatchObject({ error: "invalid" });
    expect(await updateMembership(session, "m-1", { role: "members" })).toMatchObject({ error: "invalid" });
  });

  it("refuses an inactive membership", async () => {
    memberships.fetchById.mockResolvedValue(membership());
    expect(await updateMembership(session, "m-1", { role: "owners" })).toMatchObject({ error: "conflict" });
  });

  it("refuses a service account a role it can't hold", async () => {
    memberships.fetchById.mockResolvedValue(
      membership({ account_id: "an-org--bot", repository_id: "a-product", state: MembershipState.Member })
    );
    expect(await updateMembership(session, "m-1", { role: "owners" })).toMatchObject({
      error: "invalid",
      fieldErrors: { role: [expect.any(String)] },
    });
    expect(memberships.update).not.toHaveBeenCalled();
  });
});
