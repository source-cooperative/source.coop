import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountsTable } from "./accounts";
import { IdentityBindingsTable } from "./identity-bindings";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";
import { LOGGER } from "@/lib/logging";
import { AccountType, type Account, type IdentityBinding } from "@/types";

jest.mock("@/lib/config", () => ({
  CONFIG: {
    environment: { stage: "test" },
    database: {},
    auth: { api: { backendUrl: "http://ory.test" } },
  },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const account = (fields: Partial<Account>): Account =>
  ({ type: AccountType.INDIVIDUAL, disabled: false, ...fields }) as Account;

const jane = account({ account_id: "jane-doe", identity_id: "ory-jane" });
const acme = account({ account_id: "acme", type: AccountType.ORGANIZATION });
const unbacked = account({ account_id: "old-timer", identity_id: "ory-old" });

/** Answers the key query and the identity_id index query from `items`. */
function fakeAccounts(items: Account[]) {
  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const values = command.input.ExpressionAttributeValues as Record<string, string> | undefined;
    if (!values) return {}; // a Delete of the row itself
    if (values[":account_id"] !== undefined) {
      return { Items: items.filter((a) => a.account_id === values[":account_id"]) };
    }
    return { Items: items.filter((a) => a.identity_id === values[":identity_id"]) };
  });
  return { send, client: { send } as unknown as DynamoDBDocumentClient };
}

/** Answers Get by key, Query on the account_id index, and Delete, over `bindings`. */
function fakeBindings(bindings: IdentityBinding[]) {
  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const key = command.input.Key as { issuer: string; subject: string } | undefined;
    const at = (b: IdentityBinding) => b.issuer === key?.issuer && b.subject === key?.subject;
    if (key && command.constructor.name === "DeleteCommand") {
      bindings.splice(bindings.findIndex(at), 1);
      return {};
    }
    if (key) return { Item: bindings.find(at) };
    const values = command.input.ExpressionAttributeValues as Record<string, string>;
    return { Items: bindings.filter((b) => b.account_id === values[":account_id"]) };
  });
  return new IdentityBindingsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
}

function tableFor(items: Account[], bindings: IdentityBinding[]) {
  const accounts = fakeAccounts(items);
  const table = new AccountsTable({
    client: accounts.client,
    memoizedRead: createMemoizedRead(fakeReactCache),
    bindings: fakeBindings(bindings),
  });
  return { table, send: accounts.send };
}

const bound = (subject: string, account_id: string, issuer = "http://ory.test") =>
  ({ issuer, subject, account_id, created_at: "2024-01-01T00:00:00Z" }) as IdentityBinding;

describe("AccountsTable identity resolution", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves an Ory identity through its binding, without touching the index", async () => {
    const { table, send } = tableFor([jane, unbacked], [bound("ory-jane", "jane-doe")]);

    expect(await table.fetchByOryId("ory-jane")).toEqual(jane);
    expect(send.mock.calls.map((c) => c[0].input.IndexName)).toEqual([undefined]);
    expect(LOGGER.warn).not.toHaveBeenCalled();
  });

  it("falls back to the identity_id index for an account with no binding yet, and says so", async () => {
    const { table } = tableFor([jane, unbacked], [bound("ory-jane", "jane-doe")]);

    expect(await table.fetchByOryId("ory-old")).toEqual(unbacked);
    expect(LOGGER.warn).toHaveBeenCalledWith(
      expect.stringContaining("identity_id index"),
      expect.objectContaining({ metadata: { identity_id: "ory-old", account_id: "old-timer" } })
    );
  });

  it("returns nothing for an unknown identity", async () => {
    const { table } = tableFor([jane], [bound("ory-jane", "jane-doe")]);
    expect(await table.fetchByOryId("ory-nobody")).toBeNull();
  });

  it("keeps fetchByOryId to individuals, while fetchByIdentity resolves any account type", async () => {
    const bindings = [bound("ci-subject", "acme", "https://ci.example")];
    const { table } = tableFor([acme], bindings);

    expect(await table.fetchByIdentity("https://ci.example", "ci-subject")).toEqual(acme);
    // The same pair under the Ory issuer is not bound...
    expect(await table.fetchByOryId("ci-subject")).toBeNull();
    // ...and a non-individual bound under Ory is not an Ory account either.
    const { table: odd } = tableFor([acme], [bound("ory-acme", "acme")]);
    expect(await odd.fetchByOryId("ory-acme")).toBeNull();
  });

  it("removes an account's bindings when the account is deleted", async () => {
    // Otherwise the orphaned pair would keep that identity from ever binding again.
    const bindings = [bound("ory-jane", "jane-doe"), bound("ci", "jane-doe", "https://ci.example")];
    const { table } = tableFor([jane], bindings);

    await table.delete({ account_id: "jane-doe", type: AccountType.INDIVIDUAL });

    expect(bindings).toEqual([]);
  });

  it("tells issuers apart", async () => {
    const { table } = tableFor(
      [jane, acme],
      [bound("shared", "jane-doe"), bound("shared", "acme", "https://ci.example")]
    );
    expect(await table.fetchByIdentity("http://ory.test", "shared")).toEqual(jane);
    expect(await table.fetchByIdentity("https://ci.example", "shared")).toEqual(acme);
  });
});
