/** @jest-environment node */
import { Account, AccountFlags, AccountType, Actions } from "@/types";
import { accountsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import {
  getAccountFlags,
  getAccountProfile,
  updateAccountFlags,
  updateAccountProfile,
  whoami,
} from "./accounts";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn(), update: jest.fn() },
}));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));
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

describe("getAccountProfile", () => {
  it("serves an organization's profile with its name", async () => {
    fetchById.mockResolvedValue(
      account({ type: AccountType.ORGANIZATION, metadata_public: { bio: "Hi" } })
    );
    const result = await getAccountProfile(null, "an-account");
    expect(result).toEqual({
      ok: true,
      value: { bio: "Hi", name: "An Account", type: "organization", profile_image: undefined },
    });
  });

  it("prefers an uploaded image to a person's Gravatar", async () => {
    const emails = [{ address: "p@example.test", is_primary: true }];
    fetchById.mockResolvedValue(account({ emails }));
    const gravatar = await getAccountProfile(null, "an-account");
    expect(gravatar.ok && gravatar.value.profile_image).toMatch(
      /^https:\/\/www\.gravatar\.com\/avatar\/\w+\?d=identicon/
    );

    fetchById.mockResolvedValue(
      account({ emails, metadata_public: { profile_image: "https://img.test/a.png" } })
    );
    const uploaded = await getAccountProfile(null, "an-account");
    expect(uploaded.ok && uploaded.value.profile_image).toBe("https://img.test/a.png");
  });

  it("finds no profile for a service account", async () => {
    fetchById.mockResolvedValue(account({ type: AccountType.SERVICE }));
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await getAccountProfile(null, "an-account")).toMatchObject({ error: "not_found" });
  });
});

describe("updateAccountProfile", () => {
  const org = (emails: unknown[] = []) =>
    fetchById.mockResolvedValue(account({ type: AccountType.ORGANIZATION, emails }));

  it("changes only the fields given, and clears one given empty", async () => {
    fetchById.mockResolvedValue(
      account({ metadata_public: { bio: "Old", location: "Augsburg", orcid: "0000" } })
    );
    const result = await updateAccountProfile(SESSION, "an-account", { bio: "New", orcid: "" });
    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({
      name: "An Account",
      metadata_public: { bio: "New", location: "Augsburg", orcid: undefined },
    });
  });

  it("takes a website without a scheme as https, and keeps an unchanged one's record", async () => {
    const kept = { domain: "https://kept.test", status: "verified", created_at: "2020-01-01T00:00:00.000Z" };
    fetchById.mockResolvedValue(account({ metadata_public: { domains: [kept] } }));
    await updateAccountProfile(SESSION, "an-account", {
      websites: ["https://kept.test", "new.test", " "],
    });
    expect(written().metadata_public.domains).toEqual([
      kept,
      expect.objectContaining({ domain: "https://new.test", status: "unverified" }),
    ]);
  });

  it("refuses a website that isn't a URL", async () => {
    fetchById.mockResolvedValue(account());
    const result = await updateAccountProfile(SESSION, "an-account", { websites: ["http://"] });
    expect(result).toMatchObject({ error: "invalid", fieldErrors: { websites: expect.any(Array) } });
    expect(update).not.toHaveBeenCalled();
  });

  it("stores an organization's submitted email as its unverified primary", async () => {
    org();
    const result = await updateAccountProfile(SESSION, "an-account", {
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
    await updateAccountProfile(SESSION, "an-account", { email: "contact@example.test" });
    expect(written().emails).toEqual(emails);
  });

  it("rejects a malformed organization email without writing", async () => {
    org();
    const result = await updateAccountProfile(SESSION, "an-account", { email: "not-an-email" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { email: ["Invalid email address"] } });
    expect(update).not.toHaveBeenCalled();
  });

  it("clears an organization's email when the field is submitted empty", async () => {
    org([{ address: "old@example.test", is_primary: true, verified: true }]);
    await updateAccountProfile(SESSION, "an-account", { email: "   " });
    expect(written().emails).toEqual([]);
  });

  // An individual's email lives in the identity provider, so the form field is
  // read-only and never submitted. A forged submission must not move it anyway.
  it("ignores an email submitted for an individual account", async () => {
    const emails = [{ address: "person@example.test", is_primary: true, verified: true }];
    fetchById.mockResolvedValue(account({ emails }));
    const result = await updateAccountProfile(SESSION, "an-account", {
      email: "attacker@example.test",
    });
    expect(result.ok).toBe(true);
    expect(written().emails).toEqual(emails);
  });

  it("writes only the fields it edits, never flags or disabled", async () => {
    fetchById.mockResolvedValue(account({ flags: [AccountFlags.ADMIN], disabled: false }));
    await updateAccountProfile(SESSION, "an-account", { bio: "New" });
    expect(written()).not.toHaveProperty("flags");
    expect(written()).not.toHaveProperty("disabled");
  });

  it("refuses an identifier that belongs to the other kind of account", async () => {
    org();
    expect(await updateAccountProfile(SESSION, "an-account", { orcid: "0000" })).toMatchObject({
      error: "invalid",
      fieldErrors: { orcid: expect.any(Array) },
    });
    fetchById.mockResolvedValue(account());
    expect(await updateAccountProfile(SESSION, "an-account", { ror_id: "x" })).toMatchObject({
      error: "invalid",
      fieldErrors: { ror_id: expect.any(Array) },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("finds no profile to edit on a service account", async () => {
    fetchById.mockResolvedValue(account({ type: AccountType.SERVICE }));
    expect(await updateAccountProfile(SESSION, "an-account", { bio: "x" })).toMatchObject({
      error: "not_found",
    });
  });

  it("treats an empty account ID as missing, without a lookup", async () => {
    expect(await updateAccountProfile(SESSION, "", { bio: "x" })).toMatchObject({
      error: "not_found",
    });
    expect(fetchById).not.toHaveBeenCalled();
  });

  it("needs a session, then authorization, before reading the input", async () => {
    fetchById.mockResolvedValue(account());
    expect(await updateAccountProfile(null, "an-account", {})).toMatchObject({
      error: "unauthenticated",
    });
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await updateAccountProfile(SESSION, "an-account", { name: 5 })).toMatchObject({
      error: "forbidden",
    });
  });
});

describe("account flags", () => {
  it("reads the flags of the account named, not the caller's", async () => {
    fetchById.mockResolvedValue(account({ flags: [AccountFlags.CREATE_REPOSITORIES] }));
    expect(await getAccountFlags(SESSION, "an-account")).toEqual({
      ok: true,
      value: [AccountFlags.CREATE_REPOSITORIES],
    });
    expect(fetchById).toHaveBeenCalledWith("an-account");
    expect(isAuthorized).toHaveBeenCalledWith(SESSION, expect.anything(), Actions.GetAccountFlags);
  });

  it("refuses the admin flag to a service account", async () => {
    fetchById.mockResolvedValue(account({ type: AccountType.SERVICE }));
    const result = await updateAccountFlags(SESSION, "an-account", [AccountFlags.ADMIN]);
    expect(result).toMatchObject({ error: "invalid" });
    expect(update).not.toHaveBeenCalled();
  });

  it("writes only the flags, so a concurrent profile edit survives", async () => {
    fetchById.mockResolvedValue(account({ metadata_public: { bio: "Old" } }));
    await updateAccountFlags(SESSION, "an-account", [AccountFlags.CREATE_REPOSITORIES]);
    expect(written()).toEqual(
      expect.objectContaining({ account_id: "an-account", flags: [AccountFlags.CREATE_REPOSITORIES] })
    );
    expect(written()).not.toHaveProperty("metadata_public");
    expect(written()).not.toHaveProperty("disabled");
  });

  it("refuses a flag that doesn't exist", async () => {
    fetchById.mockResolvedValue(account());
    expect(await updateAccountFlags(SESSION, "an-account", ["root"])).toMatchObject({
      error: "invalid",
    });
  });
});
