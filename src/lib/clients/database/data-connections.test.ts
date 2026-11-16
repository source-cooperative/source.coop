import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DataConnectionsTable } from "./data-connections";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

function tableWith(send: jest.Mock) {
  return new DataConnectionsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
}

describe("DataConnectionsTable", () => {
  it("filters a page by owner, with or without the unowned connections", async () => {
    const send = jest.fn(async () => ({ Items: [] }));
    const table = tableWith(send);
    await table.listPage(20, { data_connection_id: "a" }, "acme");
    await table.listPage(20, undefined, "acme", true);

    const [owned, usable] = send.mock.calls.map((c) => c[0].input);
    expect(owned).toMatchObject({
      Limit: 20,
      ExclusiveStartKey: { data_connection_id: "a" },
      FilterExpression: "#owner = :owner",
      ExpressionAttributeValues: { ":owner": "acme" },
    });
    // A bare `owner` is a reserved word, which DynamoDB rejects outright.
    expect(owned.ExpressionAttributeNames).toEqual({ "#owner": "owner" });
    expect(usable.FilterExpression).toBe(
      "attribute_not_exists(#owner) OR #owner = :owner"
    );
  });

  it("reads the whole table, past DynamoDB's 1 MB page", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Items: [{ data_connection_id: "a" }], LastEvaluatedKey: { data_connection_id: "a" } })
      .mockResolvedValueOnce({ Items: [{ data_connection_id: "b" }] });

    const all = await tableWith(send).listAll();

    expect(all.map((c) => c.data_connection_id)).toEqual(["a", "b"]);
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ data_connection_id: "a" });
  });
});
