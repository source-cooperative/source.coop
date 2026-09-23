import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountTrustsTable, AlreadyTrustedError } from "./account-trusts";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

function tableWith(send: jest.Mock) {
  return new AccountTrustsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
}

const trust = {
  account_id: "o-bot",
  issuer: "https://ci.example",
  subject: "repo:o/r:ref:refs/heads/main",
  created_at: "2024-01-01T00:00:00Z",
  created_by: "o-owner",
};
const KEY = { account_id: "o-bot", identity: "https://ci.example repo:o/r:ref:refs/heads/main" };

describe("AccountTrustsTable", () => {
  it("writes a trust under the account, keyed by issuer and subject, only once", async () => {
    const send = jest.fn(async () => ({}));
    await tableWith(send).create(trust);

    const input = send.mock.calls[0][0].input;
    expect(input.TableName).toBe("sc-test-account-trusts");
    expect(input.Item).toEqual({ ...trust, identity: KEY.identity });
    expect(input.ConditionExpression).toBe("attribute_not_exists(identity)");
  });

  it("names a repeat for what it is", async () => {
    const send = jest.fn(async () => {
      const error = new Error("The conditional request failed") as Error & { name: string };
      error.name = "ConditionalCheckFailedException";
      throw error;
    });
    await expect(tableWith(send).create(trust)).rejects.toBeInstanceOf(AlreadyTrustedError);
  });

  it("answers whether an account trusts a subject with one exact read", async () => {
    const send = jest.fn(async () => ({ Item: trust }));
    const table = tableWith(send);

    expect(await table.isTrusted("o-bot", trust.issuer, trust.subject)).toBe(true);
    expect(send.mock.calls[0][0].input.Key).toEqual(KEY);
    expect(await tableWith(jest.fn(async () => ({}))).isTrusted("o-bot", "x", "y")).toBe(false);
  });

  it("refuses a malformed row before touching the table", async () => {
    const send = jest.fn(async () => ({}));
    const table = tableWith(send);
    await expect(table.create({ ...trust, issuer: "" })).rejects.toThrow();
    await expect(table.create({ ...trust, subject: "" })).rejects.toThrow();
    await expect(table.create({ ...trust, account_id: "" })).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it("lists an account's trusts from the request cache unless told not to", async () => {
    const send = jest.fn(async () => ({ Items: [trust] }));
    const table = tableWith(send);

    expect(await table.listByAccount("o-bot")).toEqual([trust]);
    expect(await table.listByAccount("o-bot")).toEqual([trust]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await table.listByAccount("o-bot", true)).toEqual([trust]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("follows a paginated listing to the end", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Items: [trust], LastEvaluatedKey: { account_id: "o-bot", identity: "x" } })
      .mockResolvedValueOnce({ Items: [{ ...trust, subject: "second" }] });
    const listed = await tableWith(send).listByAccount("o-bot", true);
    expect(listed.map((t) => t.subject)).toEqual([trust.subject, "second"]);
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ account_id: "o-bot", identity: "x" });
  });

  it("follows a paginated listing to the end", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Items: [trust], LastEvaluatedKey: { account_id: "o-bot", identity: "x" } })
      .mockResolvedValueOnce({ Items: [{ ...trust, subject: "second" }] });
    const listed = await tableWith(send).listByAccount("o-bot", true);
    expect(listed.map((t) => t.subject)).toEqual([trust.subject, "second"]);
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ account_id: "o-bot", identity: "x" });
  });

  it("deletes by the same key", async () => {
    const send = jest.fn(async () => ({}));
    await tableWith(send).delete("o-bot", trust.issuer, trust.subject);
    expect(send.mock.calls[0][0].input.Key).toEqual(KEY);
  });
});
