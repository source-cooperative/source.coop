import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { IdentityAlreadyBoundError, IdentityBindingsTable } from "./identity-bindings";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

function tableWith(send: jest.Mock) {
  return new IdentityBindingsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
}

const binding = {
  issuer: "https://ci.example",
  subject: "repo:o/r:ref:refs/heads/main",
  account_id: "o-bot",
  created_at: "2024-01-01T00:00:00Z",
};

describe("IdentityBindingsTable", () => {
  it("writes a binding only if the pair is not already bound", async () => {
    const send = jest.fn(async () => ({}));
    await tableWith(send).create(binding);

    const input = send.mock.calls[0][0].input;
    expect(input.TableName).toBe("sc-test-identity-bindings");
    expect(input.Item).toEqual(binding);
    expect(input.ConditionExpression).toBe("attribute_not_exists(issuer)");
  });

  it("names a conflict on the pair for what it is", async () => {
    const send = jest.fn(async () => {
      const error = new Error("The conditional request failed") as Error & { name: string };
      error.name = "ConditionalCheckFailedException";
      throw error;
    });
    await expect(tableWith(send).create(binding)).rejects.toBeInstanceOf(IdentityAlreadyBoundError);
  });

  it("resolves by the (issuer, subject) key", async () => {
    const send = jest.fn(async () => ({ Item: binding }));
    const table = tableWith(send);

    expect(await table.resolve(binding.issuer, binding.subject)).toEqual(binding);
    expect(send.mock.calls[0][0].input.Key).toEqual({
      issuer: binding.issuer,
      subject: binding.subject,
    });
    expect(await tableWith(jest.fn(async () => ({}))).resolve("x", "y")).toBeNull();
  });

  it("refuses a malformed row before touching the table", async () => {
    // An issuer read from unset config is "", and every binding written under
    // it would share one partition; an empty account_id cannot be indexed.
    const send = jest.fn(async () => ({}));
    const table = tableWith(send);
    await expect(table.create({ ...binding, issuer: "" })).rejects.toThrow();
    await expect(table.create({ ...binding, subject: "" })).rejects.toThrow();
    await expect(table.create({ ...binding, account_id: "" })).rejects.toThrow();
    await expect(table.create({ ...binding, created_at: "yesterday" })).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it("lists an account's bindings from the request cache unless told not to", async () => {
    const send = jest.fn(async () => ({ Items: [binding] }));
    const table = tableWith(send);

    expect(await table.listByAccount("o-bot")).toEqual([binding]);
    expect(await table.listByAccount("o-bot")).toEqual([binding]);
    expect(send).toHaveBeenCalledTimes(1);

    // A destructive caller reads what the table holds now.
    expect(await table.listByAccount("o-bot", true)).toEqual([binding]);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
