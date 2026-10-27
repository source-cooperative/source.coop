/** @jest-environment node */
import { Account, AccountFlags, AccountType, Actions } from "@/types";
import {
  accountsTable,
  membershipsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { searchUsers } from "@/lib/api/user-lookup";
import {
  createOrganization,
  deleteAccount,
  getAccount,
  searchAccounts,
  updateAccount,
  whoami,
} from "./accounts";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    searchMemberCandidates: jest.fn(),
  },
  membershipsTable: { listByUser: jest.fn(), delete: jest.fn(), create: jest.fn() },
  serviceAccountKeysTable: { listByAccount: jest.fn(), delete: jest.fn() },
}));
jest.mock("@/lib/accounts/service-accounts", () => ({ managedServiceAccount: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn(), isAdmin: jest.fn() }));
jest.mock("@/lib/api/user-lookup", () => ({ searchUsers: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const SESSION = { identity_id: "an-identity", account: { account_id: "alice" } } as never;

const account = (overrides: Record<string, unknown> = {}) =>
  ({
    account_id: "an-account",
    name: "An Account",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [],
    metadata_public: {},
    ...overrides,
  }) as unknown as Account;

const fetchById = accountsTable.fetchById as jest.Mock;
const update = accountsTable.update as jest.Mock;
const written = () => update.mock.calls[0][0];

beforeEach(() => {
  jest.resetAllMocks();
  (isAuthorized as jest.Mock).mockReturnValue(true);
  update.mockImplementation(async (a) => a);
});

describe("whoami", () => {
  it("answers the session without the Ory session behind it", () => {
    const result = whoami({ ...(SESSION as object), orySession: { id: "x" } } as never);
    expect(result).toEqual({
      ok: true,
      value: { identity_id: "an-identity", account: { account_id: "alice" }, memberships: undefined },
    });
  });

  it("needs a session", () => {
    expect(whoami(null)).toMatchObject({ ok: false, error: "unauthenticated" });
  });
});

describe("getAccount", () => {
  beforeEach(() => {
    (isAuthorized as jest.Mock).mockImplementation((_s, _a, action) => action !== Actions.GetAccount);
  });

  it("serves the whole record to whoever may read it", async () => {
    (isAuthorized as jest.Mock).mockReturnValue(true);
    fetchById.mockResolvedValue(account({ flags: [AccountFlags.ADMIN] }));
    expect(await getAccount(SESSION, "an-account")).toEqual({
      ok: true,
      value: account({ flags: [AccountFlags.ADMIN] }),
    });
  });

  it("serves anyone else the public view, without emails, flags or private metadata", async () => {
    fetchById.mockResolvedValue(
      account({
        type: AccountType.ORGANIZATION,
        metadata_public: { bio: "Hi" },
        flags: [AccountFlags.ADMIN],
        emails: [{ address: "o@example.test", is_primary: true }],
        metadata_private: { secret: 1 },
      })
    );
    const result = await getAccount(null, "an-account");
    expect(result).toEqual({
      ok: true,
      value: {
        account_id: "an-account",
        type: "organization",
        name: "An Account",
        disabled: false,
        metadata_public: { bio: "Hi" },
        profile_image: undefined,
      },
    });
  });

  it("prefers an uploaded image to a person's Gravatar", async () => {
    const emails = [{ address: "p@example.test", is_primary: true }];
    fetchById.mockResolvedValue(account({ emails }));
    expect(await getAccount(null, "an-account")).toMatchObject({
      value: { profile_image: expect.stringMatching(/^https:\/\/www\.gravatar\.com\/avatar\/\w+\?d=identicon/) },
    });

    fetchById.mockResolvedValue(
      account({ emails, metadata_public: { profile_image: "https://img.test/a.png" } })
    );
    expect(await getAccount(null, "an-account")).toMatchObject({
      value: { profile_image: "https://img.test/a.png" },
    });
  });

  it("finds neither a service account nor a disabled account for anyone else", async () => {
    (isAuthorized as jest.Mock).mockReturnValue(false);
    fetchById.mockResolvedValue(account({ type: AccountType.SERVICE }));
    expect(await getAccount(null, "an-account")).toMatchObject({ error: "not_found" });
    fetchById.mockResolvedValue(account({ disabled: true }));
    expect(await getAccount(null, "an-account")).toMatchObject({ error: "not_found" });
  });
});

describe("updateAccount", () => {
  const org = (emails: unknown[] = []) =>
    fetchById.mockResolvedValue(account({ type: AccountType.ORGANIZATION, emails }));

  it("changes only the fields given, and clears one given empty", async () => {
    fetchById.mockResolvedValue(
      account({ metadata_public: { bio: "Old", location: "Augsburg", orcid: "0000" } })
    );
    const result = await updateAccount(SESSION, "an-account", { bio: "New", orcid: "" });
    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({
      metadata_public: { bio: "New", location: "Augsburg", orcid: undefined },
    });
    expect(written()).not.toHaveProperty("name");
  });

  it("takes a website without a scheme as https, and keeps an unchanged one's record", async () => {
    const kept = { domain: "https://kept.test", status: "verified", created_at: "2020-01-01T00:00:00.000Z" };
    fetchById.mockResolvedValue(account({ metadata_public: { domains: [kept] } }));
    await updateAccount(SESSION, "an-account", {
      websites: ["https://kept.test", "new.test", " "],
    });
    expect(written().metadata_public.domains).toEqual([
      kept,
      expect.objectContaining({ domain: "https://new.test", status: "unverified" }),
    ]);
  });

  it("refuses a website that isn't a URL", async () => {
    fetchById.mockResolvedValue(account());
    const result = await updateAccount(SESSION, "an-account", { websites: ["http://"] });
    expect(result).toMatchObject({ error: "invalid", fieldErrors: { websites: expect.any(Array) } });
    expect(update).not.toHaveBeenCalled();
  });

  it("stores an organization's submitted email as its unverified primary", async () => {
    org();
    const result = await updateAccount(SESSION, "an-account", {
      email: " contact@example.test ",
    });
    expect(result.ok).toBe(true);
    expect(written().emails).toEqual([
      expect.objectContaining({ address: "contact@example.test", is_primary: true, verified: false }),
    ]);
  });

  // The form seeds the field with the current address, so every save of a name
  // or bio resubmits it. Rebuilding the record then would drop verified state.
  it("leaves a verified organization email alone when it is resubmitted unchanged", async () => {
    const emails = [
      { address: "contact@example.test", is_primary: true, verified: true, added_at: "2020-05-05T00:00:00.000Z" },
    ];
    org(emails);
    await updateAccount(SESSION, "an-account", { email: "contact@example.test" });
    expect(written()).not.toHaveProperty("emails");
  });

  it("rejects a malformed organization email without writing", async () => {
    org();
    const result = await updateAccount(SESSION, "an-account", { email: "not-an-email" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { email: ["Invalid email address"] } });
    expect(update).not.toHaveBeenCalled();
  });

  it("clears an organization's email when the field is submitted empty", async () => {
    org([{ address: "old@example.test", is_primary: true, verified: true }]);
    await updateAccount(SESSION, "an-account", { email: "   " });
    expect(written().emails).toEqual([]);
  });

  // An individual's email lives in the identity provider, so the form field is
  // read-only and never submitted. A forged submission must not move it anyway.
  it("ignores an email submitted for an individual account", async () => {
    const emails = [{ address: "person@example.test", is_primary: true, verified: true }];
    fetchById.mockResolvedValue(account({ emails }));
    const result = await updateAccount(SESSION, "an-account", {
      email: "attacker@example.test",
    });
    expect(result.ok).toBe(true);
    expect(written()).not.toHaveProperty("emails");
  });

  it("writes only the fields it edits, never flags or disabled", async () => {
    fetchById.mockResolvedValue(account({ flags: [AccountFlags.ADMIN], disabled: false }));
    await updateAccount(SESSION, "an-account", { bio: "New" });
    expect(written()).not.toHaveProperty("flags");
    expect(written()).not.toHaveProperty("disabled");
    expect(written()).not.toHaveProperty("name");
  });

  it("refuses an identifier that belongs to the other kind of account", async () => {
    org();
    expect(await updateAccount(SESSION, "an-account", { orcid: "0000" })).toMatchObject({
      error: "invalid",
      fieldErrors: { orcid: expect.any(Array) },
    });
    fetchById.mockResolvedValue(account());
    expect(await updateAccount(SESSION, "an-account", { ror_id: "x" })).toMatchObject({
      error: "invalid",
      fieldErrors: { ror_id: expect.any(Array) },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("renames a service account, which has nothing else to edit", async () => {
    fetchById.mockResolvedValue(account({ type: AccountType.SERVICE }));
    expect(await updateAccount(SESSION, "an-account", { name: "Nightly sync" })).toMatchObject({
      ok: true,
    });
    expect(written()).toMatchObject({ name: "Nightly sync" });
    expect(written().metadata_public).toBeUndefined();
    update.mockClear();
    expect(await updateAccount(SESSION, "an-account", { bio: "x" })).toMatchObject({
      error: "invalid",
      fieldErrors: { bio: expect.any(Array) },
    });
    expect(update).not.toHaveBeenCalled();
  });

  // Editing and disabling are separate permissions: an organization's
  // maintainers may edit it, and only its owners may disable it.
  const allow = (...actions: Actions[]) =>
    (isAuthorized as jest.Mock).mockImplementation((_s, _r, action) => actions.includes(action));

  it("disables and enables with DisableAccount alone", async () => {
    fetchById.mockResolvedValue(account());
    allow(Actions.DisableAccount);
    expect(await updateAccount(SESSION, "an-account", { disabled: true })).toMatchObject({ ok: true });
    expect(written()).toMatchObject({ disabled: true });
    expect(written().metadata_public).toBeUndefined();
    expect(await updateAccount(SESSION, "an-account", { bio: "x" })).toMatchObject({
      error: "forbidden",
    });
  });

  it("edits without DisableAccount, but refuses to change `disabled`", async () => {
    fetchById.mockResolvedValue(account());
    allow(Actions.PutAccountProfile);
    expect(await updateAccount(SESSION, "an-account", { bio: "x" })).toMatchObject({ ok: true });
    expect(await updateAccount(SESSION, "an-account", { disabled: true })).toMatchObject({
      error: "forbidden",
    });
    // Resubmitting the current state changes nothing, so it needs nothing,
    // and isn't written back over a concurrent change.
    update.mockClear();
    expect(await updateAccount(SESSION, "an-account", { bio: "y", disabled: false })).toMatchObject({
      ok: true,
    });
    expect(written()).not.toHaveProperty("disabled");
  });

  it("treats an empty account ID as missing, without a lookup", async () => {
    expect(await updateAccount(SESSION, "", { bio: "x" })).toMatchObject({
      error: "not_found",
    });
    expect(fetchById).not.toHaveBeenCalled();
  });

  it("needs a session, then authorization, before reading the input", async () => {
    fetchById.mockResolvedValue(account());
    expect(await updateAccount(null, "an-account", {})).toMatchObject({
      error: "unauthenticated",
    });
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await updateAccount(SESSION, "an-account", { name: 5 })).toMatchObject({
      error: "forbidden",
    });
  });
});

describe("updateAccount's flags", () => {
  const setFlags = (flags: unknown) => updateAccount(SESSION, "an-account", { flags });

  it("takes PutAccountFlags", async () => {
    fetchById.mockResolvedValue(account());
    (isAuthorized as jest.Mock).mockImplementation((_s, _a, action) => action !== Actions.PutAccountFlags);
    expect(await setFlags([AccountFlags.CREATE_REPOSITORIES])).toMatchObject({ error: "forbidden" });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses the admin flag to a service account", async () => {
    fetchById.mockResolvedValue(account({ type: AccountType.SERVICE }));
    expect(await setFlags([AccountFlags.ADMIN])).toMatchObject({ error: "invalid" });
    expect(update).not.toHaveBeenCalled();
  });

  it("writes only the flags, so a concurrent profile edit survives", async () => {
    fetchById.mockResolvedValue(account({ metadata_public: { bio: "Old" } }));
    await setFlags([AccountFlags.CREATE_REPOSITORIES]);
    expect(written()).toEqual(
      expect.objectContaining({ account_id: "an-account", flags: [AccountFlags.CREATE_REPOSITORIES] })
    );
    expect(written()).not.toHaveProperty("metadata_public");
    expect(written()).not.toHaveProperty("disabled");
  });

  it("refuses a flag that doesn't exist", async () => {
    fetchById.mockResolvedValue(account());
    expect(await setFlags(["root"])).toMatchObject({ error: "invalid" });
  });
});

describe("deleteAccount", () => {
  const bot = () => account({ type: AccountType.SERVICE, owner_account_id: "acme" });

  it("disables a service account, deletes its grants and keys, then deletes it", async () => {
    fetchById.mockResolvedValue(bot());
    (managedServiceAccount as jest.Mock).mockResolvedValue(bot());
    (membershipsTable.listByUser as jest.Mock).mockResolvedValue([
      { membership_id: "m1" },
      { membership_id: "m2" },
    ]);
    (serviceAccountKeysTable.listByAccount as jest.Mock).mockResolvedValue([
      { key_hash: "live" },
      { key_hash: "gone", revoked_at: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(await deleteAccount(SESSION, "an-account")).toMatchObject({ ok: true });
    expect(written()).toMatchObject({ account_id: "an-account", disabled: true });
    expect(membershipsTable.delete).toHaveBeenCalledTimes(2);
    expect(serviceAccountKeysTable.delete).toHaveBeenCalledTimes(2);
    expect(serviceAccountKeysTable.delete).toHaveBeenCalledWith("live");
    expect(accountsTable.delete).toHaveBeenCalledWith("an-account");
  });

  it("never deletes a person or an organization", async () => {
    for (const type of [AccountType.INDIVIDUAL, AccountType.ORGANIZATION]) {
      fetchById.mockResolvedValue(account({ type }));
      expect(await deleteAccount(SESSION, "an-account")).toMatchObject({ error: "conflict" });
    }
    expect(accountsTable.delete).not.toHaveBeenCalled();
  });

  it("tells only a caller who may disable a person how to", async () => {
    fetchById.mockResolvedValue(account());
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await deleteAccount(SESSION, "an-account")).toMatchObject({ error: "forbidden" });
    expect(isAuthorized).toHaveBeenCalledWith(SESSION, account(), Actions.DisableAccount);
  });

  it("hides a service account from whoever may not manage it", async () => {
    fetchById.mockResolvedValue(bot());
    (managedServiceAccount as jest.Mock).mockResolvedValue(null);
    expect(await deleteAccount(SESSION, "an-account")).toMatchObject({ error: "not_found" });
    expect(update).not.toHaveBeenCalled();
    expect(await deleteAccount(null, "an-account")).toMatchObject({ error: "unauthenticated" });
    expect(accountsTable.delete).not.toHaveBeenCalled();
  });
});

describe("searchAccounts", () => {
  const search = accountsTable.searchMemberCandidates as jest.Mock;
  beforeEach(() => search.mockResolvedValue([{ account_id: "bob" }]));

  it("answers a page of people", async () => {
    expect(await searchAccounts(SESSION, { q: "bo" })).toEqual({
      ok: true,
      value: { items: [{ account_id: "bob" }], next_cursor: null },
    });
    expect(search).toHaveBeenLastCalledWith("bo", undefined);
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it("offers an account's service accounts only to someone who may invite to it", async () => {
    await searchAccounts(SESSION, { q: "bo", member_of: "acme" });
    expect(search).toHaveBeenLastCalledWith("bo", "acme");
    expect(isAuthorized).toHaveBeenCalledWith(
      SESSION,
      { membership_account_id: "acme" },
      Actions.InviteMembership
    );
    (isAuthorized as jest.Mock).mockReturnValue(false);
    await searchAccounts(SESSION, { q: "bo", member_of: "acme" });
    expect(search).toHaveBeenLastCalledWith("bo", undefined);
  });

  it("needs a session and two characters", async () => {
    expect(await searchAccounts(null, { q: "bo" })).toMatchObject({ error: "unauthenticated" });
    expect(await searchAccounts(SESSION, { q: " b " })).toMatchObject({ error: "invalid" });
    expect(await searchAccounts(SESSION, {})).toMatchObject({ error: "invalid" });
    expect(search).not.toHaveBeenCalled();
  });

  it("looks up an email for an admin only", async () => {
    expect(await searchAccounts(SESSION, { q: "bob@example.com" })).toMatchObject({
      error: "forbidden",
    });
    expect(searchUsers).not.toHaveBeenCalled();

    (isAdmin as jest.Mock).mockReturnValue(true);
    (searchUsers as jest.Mock).mockResolvedValue({ source: "ory", results: [{ account_id: "bob" }] });
    expect(await searchAccounts(SESSION, { q: "bob@example.com" })).toMatchObject({
      value: { items: [{ account_id: "bob" }] },
    });
    expect(searchUsers).toHaveBeenCalledWith("bob@example.com", "alice");
    expect(search).not.toHaveBeenCalled();
  });
});

describe("createOrganization", () => {
  const create = accountsTable.create as jest.Mock;
  const input = { account_id: "acme", name: "Acme Corp" };

  it("creates the organization and makes the caller its owner", async () => {
    expect(await createOrganization(SESSION, input)).toMatchObject({
      ok: true,
      value: { account_id: "acme", type: AccountType.ORGANIZATION, flags: [] },
    });
    expect(isAuthorized).toHaveBeenCalledWith(SESSION, "*", Actions.CreateAccount);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ account_id: "acme" }));
    expect(membershipsTable.create).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: "alice", membership_account_id: "acme", role: "owners" })
    );
  });

  it("refuses whoever may not create organizations, before reading the input", async () => {
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await createOrganization(SESSION, {})).toMatchObject({ error: "forbidden" });
    expect(await createOrganization(null, input)).toMatchObject({ error: "unauthenticated" });
    expect(create).not.toHaveBeenCalled();
  });

  it("lets only an admin name another person as owner", async () => {
    const forBob = { ...input, owner_account_id: "bob" };
    expect(await createOrganization(SESSION, forBob)).toMatchObject({ error: "forbidden" });

    (isAdmin as jest.Mock).mockReturnValue(true);
    fetchById.mockResolvedValue(account({ type: AccountType.ORGANIZATION }));
    expect(await createOrganization(SESSION, forBob)).toMatchObject({ error: "invalid" });
    expect(create).not.toHaveBeenCalled();

    fetchById.mockResolvedValue(account({ account_id: "bob" }));
    expect(await createOrganization(SESSION, forBob)).toMatchObject({ ok: true });
    expect(membershipsTable.create).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: "bob" })
    );
  });

  it("answers a taken ID as a conflict and grants nothing", async () => {
    create.mockRejectedValue(
      Object.assign(new Error("taken"), { name: "ConditionalCheckFailedException" })
    );
    expect(await createOrganization(SESSION, input)).toMatchObject({
      error: "conflict",
      fieldErrors: { account_id: ["That account ID is already taken."] },
    });
    expect(membershipsTable.create).not.toHaveBeenCalled();
  });
});
