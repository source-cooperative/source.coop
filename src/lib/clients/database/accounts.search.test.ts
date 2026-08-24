import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountsTable } from "./accounts";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";
import { AccountType, type Account } from "@/types";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const account = (fields: Partial<Account>): Account =>
  ({
    type: AccountType.INDIVIDUAL,
    disabled: false,
    ...fields,
  }) as Account;

const ITEMS = [
  account({ account_id: "jane-doe", name: "Jane Doe" }),
  account({ account_id: "jsmith", name: "John Smith" }),
  account({ account_id: "acme", name: "Jane's Lab", type: AccountType.ORGANIZATION }),
  account({ account_id: "janitor", name: "Jan Retired", disabled: true }),
];

function tableFor(items: Account[], extra: Record<string, any> = {}) {
  const send = jest.fn().mockResolvedValue({ Items: items, ...extra });
  const table = new AccountsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
  return { table, send };
}

describe("AccountsTable.searchIndividuals", () => {
  it("matches the handle or the display name, case-insensitively", async () => {
    const { table } = tableFor(ITEMS);

    expect(await table.searchIndividuals("JANE")).toEqual([
      { account_id: "jane-doe", name: "Jane Doe" },
    ]);
    expect(await table.searchIndividuals("smith")).toEqual([
      { account_id: "jsmith", name: "John Smith" },
    ]);
  });

  it("skips organizations and disabled accounts", async () => {
    const { table } = tableFor(ITEMS);

    // "jan" is a substring of the org's name and the disabled account's handle.
    expect(await table.searchIndividuals("jan")).toEqual([
      { account_id: "jane-doe", name: "Jane Doe" },
    ]);
  });

  it("returns nothing for an empty query without hitting DynamoDB", async () => {
    const { table, send } = tableFor(ITEMS);

    expect(await table.searchIndividuals("  ")).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("stops scanning once the limit is reached", async () => {
    // LastEvaluatedKey would otherwise drive a second page.
    const { table, send } = tableFor(ITEMS, { LastEvaluatedKey: { account_id: "x" } });

    expect(await table.searchIndividuals("j", 1)).toEqual([
      { account_id: "jane-doe", name: "Jane Doe" },
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
