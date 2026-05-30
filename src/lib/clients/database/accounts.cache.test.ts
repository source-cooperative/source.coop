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

describe("AccountsTable.fetchById with request memoization", () => {
  it("returns the account on every deduped call without mutating the shared response", async () => {
    const account = {
      account_id: "acme",
      type: AccountType.ORGANIZATION,
      name: "Acme",
    } as Account;
    const send = jest.fn().mockResolvedValue({ Items: [account] });
    const client = { send } as unknown as DynamoDBDocumentClient;
    const table = new AccountsTable({
      client,
      memoizedRead: createMemoizedRead(fakeReactCache),
    });

    const first = await table.fetchById("acme");
    const second = await table.fetchById("acme");

    // A second deduped read shares the cached response; a mutating `.pop()`
    // would empty the shared array and make this return null.
    expect(first).toEqual(account);
    expect(second).toEqual(account);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
