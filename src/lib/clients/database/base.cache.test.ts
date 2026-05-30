import { GetCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { BaseTable } from "./base";
import { createMemoizedRead } from "./request-cache";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

import { fakeReactCache } from "./__test-helpers__/fake-react-cache";

class TestTable extends BaseTable {
  model = "test";

  read(id: string) {
    return this.cachedSend(
      new GetCommand({ TableName: this.table, Key: { id } })
    );
  }
}

function makeTable() {
  const send = jest.fn().mockResolvedValue({ Item: { id: "x" } });
  const client = { send } as unknown as DynamoDBDocumentClient;
  const table = new TestTable({
    client,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
  return { table, send };
}

describe("BaseTable.cachedSend", () => {
  it("issues identical reads to DynamoDB only once within a request", async () => {
    const { table, send } = makeTable();

    const a = await table.read("a");
    const b = await table.read("a");

    expect(a).toEqual({ Item: { id: "x" } });
    expect(b).toEqual({ Item: { id: "x" } });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("issues reads with different inputs separately", async () => {
    const { table, send } = makeTable();

    await table.read("a");
    await table.read("b");

    expect(send).toHaveBeenCalledTimes(2);
  });
});
