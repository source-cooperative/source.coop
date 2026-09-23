import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountsTable } from "./accounts";
import { IdentityBindingsTable } from "./identity-bindings";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";
import { AccountType, type Account, type IdentityBinding } from "@/types";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const account = (fields: Partial<Account>): Account =>
  ({ type: AccountType.INDIVIDUAL, disabled: false, ...fields }) as Account;

const jane = account({ account_id: "jane-doe", identity_id: "ory-jane" });
const acme = account({ account_id: "acme", type: AccountType.ORGANIZATION });
const bot = account({ account_id: "acme-bot", type: AccountType.SERVICE });

/** Answers the key query and the identity_id index query from `items`; records writes. */
function fakeAccounts(items: Account[]) {
  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const values = command.input.ExpressionAttributeValues as Record<string, string> | undefined;
    if (!values) return {}; // a write
    if (values[":account_id"] !== undefined) {
      return { Items: items.filter((a) => a.account_id === values[":account_id"]) };
    }
    return { Items: items.filter((a) => a.identity_id === values[":identity_id"]) };
  });
  return { send, client: { send } as unknown as DynamoDBDocumentClient };
}

/** Answers Get by key and Query on the account_id index over `bindings`. */
function fakeBindings(bindings: IdentityBinding[]) {
  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const key = command.input.Key as { issuer: string; subject: string } | undefined;
    if (key) return { Item: bindings.find((b) => b.issuer === key.issuer && b.subject === key.subject) };
    const values = command.input.ExpressionAttributeValues as Record<string, string>;
    return { Items: bindings.filter((b) => b.account_id === values[":account_id"]) };
  });
  const table = new IdentityBindingsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
  return { table, send };
}

function tableFor(items: Account[], bindings: IdentityBinding[]) {
  const accounts = fakeAccounts(items);
  const bound = fakeBindings(bindings);
  const table = new AccountsTable({
    client: accounts.client,
    memoizedRead: createMemoizedRead(fakeReactCache),
    bindings: bound.table,
  });
  return { table, send: accounts.send, bindingsSend: bound.send };
}

const CI = "https://ci.example";
const PROXY = "https://data.example";

const bound = (issuer: string, subject: string, account_id: string) =>
  ({ issuer, subject, account_id, created_at: "2024-01-01T00:00:00Z" }) as IdentityBinding;

describe("AccountsTable identity resolution", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves an Ory identity through the identity_id index, never the bindings table", async () => {
    // Ory identities are not bindings: a person's identity_id is on the row,
    // and the session, the email lookup and the proxy credentials read it there.
    const { table, bindingsSend } = tableFor([jane], [bound(PROXY, "ory-jane", "acme-bot")]);

    expect(await table.fetchByOryId("ory-jane")).toEqual(jane);
    expect(await table.fetchByOryId("ory-nobody")).toBeNull();
    expect(bindingsSend).not.toHaveBeenCalled();
  });

  it("resolves any account type through a binding, while fetchByOryId stays individual-only", async () => {
    const bindings = [bound(CI, "ci-subject", "acme"), bound(PROXY, "acme-bot", "acme-bot")];
    const { table } = tableFor([acme, bot], bindings);

    expect(await table.fetchByIdentity(CI, "ci-subject")).toEqual(acme);
    expect(await table.fetchByIdentity(PROXY, "acme-bot")).toEqual(bot);
    // A bound subject is not an Ory identity; nothing on the row carries it.
    expect(await table.fetchByOryId("ci-subject")).toBeNull();
    expect(await table.fetchByIdentity(CI, "unknown")).toBeNull();
  });

  it("removes an account and its bindings in one transaction, keyed as the tables are", async () => {
    // Otherwise an orphaned pair would keep that subject from ever binding
    // again — and a half-done cascade would leave an account some of whose
    // sign-in paths are gone.
    const bindings = [bound(PROXY, "acme-bot", "acme-bot"), bound(CI, "ci", "acme-bot")];
    const { table, send, bindingsSend } = tableFor([bot], bindings);

    await table.delete("acme-bot");

    // The list is read fresh, not from the request cache.
    expect(bindingsSend.mock.calls[0][0].constructor.name).toBe("QueryCommand");
    const write = send.mock.calls.find((c) => c[0].constructor.name === "TransactWriteCommand")!;
    expect(write[0].input.TransactItems).toEqual([
      { Delete: { TableName: "sc-test-identity-bindings", Key: { issuer: PROXY, subject: "acme-bot" } } },
      { Delete: { TableName: "sc-test-identity-bindings", Key: { issuer: CI, subject: "ci" } } },
      { Delete: { TableName: "sc-test-accounts", Key: { account_id: "acme-bot" } } },
    ]);
  });

  it("tells issuers apart", async () => {
    const { table } = tableFor(
      [acme, bot],
      [bound(CI, "shared", "acme"), bound(PROXY, "shared", "acme-bot")]
    );
    expect(await table.fetchByIdentity(CI, "shared")).toEqual(acme);
    expect(await table.fetchByIdentity(PROXY, "shared")).toEqual(bot);
  });
});
