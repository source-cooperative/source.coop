import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountsTable } from "./accounts";
import { AccountTrustsTable } from "./account-trusts";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";
import { AccountType, type Account, type AccountTrust } from "@/types";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const account = (fields: Partial<Account>): Account =>
  ({ type: AccountType.INDIVIDUAL, disabled: false, ...fields }) as Account;

const jane = account({ account_id: "jane-doe", identity_id: "ory-jane" });
const bot = account({ account_id: "acme-bot", type: AccountType.SERVICE });

const CI = "https://ci.example";
const GH = "https://token.actions.githubusercontent.com";
const trust = (issuer: string, subject: string): AccountTrust => ({
  account_id: "acme-bot",
  issuer,
  subject,
  created_at: "2024-01-01T00:00:00Z",
  created_by: "acme-owner",
});

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

function fakeTrusts(trusts: AccountTrust[]) {
  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const values = command.input.ExpressionAttributeValues as Record<string, string>;
    return { Items: trusts.filter((t) => t.account_id === values[":account_id"]) };
  });
  const table = new AccountTrustsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
  return { table, send };
}

function tableFor(items: Account[], trusts: AccountTrust[]) {
  const accounts = fakeAccounts(items);
  const trusted = fakeTrusts(trusts);
  const table = new AccountsTable({
    client: accounts.client,
    memoizedRead: createMemoizedRead(fakeReactCache),
    trusts: trusted.table,
  });
  return { table, send: accounts.send, trustsSend: trusted.send };
}

describe("AccountsTable and account trusts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves an Ory identity through the identity_id index, never the trusts table", async () => {
    const { table, trustsSend } = tableFor([jane], [trust(GH, "ory-jane")]);

    expect(await table.fetchByOryId("ory-jane")).toEqual(jane);
    expect(await table.fetchByOryId("ory-nobody")).toBeNull();
    expect(trustsSend).not.toHaveBeenCalled();
  });

  it("removes an account and its trusts in one transaction, keyed as the tables are", async () => {
    // A half-done cascade would leave an account some of whose sign-in paths
    // are gone, or trusts that outlive their account.
    const trusts = [trust(GH, "repo:acme/data:ref:refs/heads/main"), trust(CI, "ci")];
    const { table, send, trustsSend } = tableFor([bot], trusts);

    await table.delete("acme-bot");

    // The list is read fresh, not from the request cache.
    expect(trustsSend.mock.calls[0][0].constructor.name).toBe("QueryCommand");
    const write = send.mock.calls.find((c) => c[0].constructor.name === "TransactWriteCommand")!;
    expect(write[0].input.TransactItems).toEqual([
      {
        Delete: {
          TableName: "sc-test-account-trusts",
          Key: { account_id: "acme-bot", identity: `${GH} repo:acme/data:ref:refs/heads/main` },
        },
      },
      { Delete: { TableName: "sc-test-account-trusts", Key: { account_id: "acme-bot", identity: `${CI} ci` } } },
      { Delete: { TableName: "sc-test-accounts", Key: { account_id: "acme-bot" } } },
    ]);
  });

  it("splits a long cascade into transactions of at most 100, the account row last", async () => {
    const many = Array.from({ length: 150 }, (_, i) => trust(GH, `repo:acme/r${i}:ref:refs/heads/main`));
    const { table, send } = tableFor([bot], many);

    await table.delete("acme-bot");

    const writes = send.mock.calls.filter((c) => c[0].constructor.name === "TransactWriteCommand");
    expect(writes.map((w) => w[0].input.TransactItems.length)).toEqual([100, 51]);
    const last = writes[1][0].input.TransactItems.at(-1);
    expect(last).toEqual({ Delete: { TableName: "sc-test-accounts", Key: { account_id: "acme-bot" } } });
  });
});
