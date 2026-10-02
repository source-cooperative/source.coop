import {
  DeleteCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { APIKeysTable } from "./api-keys";

describe("APIKeysTable", () => {
  it("deletes a key, secret and all, by its access key id", async () => {
    const send = jest.fn(async () => ({}));
    const table = new APIKeysTable({
      client: { send } as unknown as DynamoDBDocumentClient,
    });

    await table.delete("SCREGULARUSER");

    const [command] = send.mock.calls[0] as unknown as [DeleteCommand];
    expect(command).toBeInstanceOf(DeleteCommand);
    expect(command.input).toEqual({
      TableName: "sc-test-api-keys",
      Key: { access_key_id: "SCREGULARUSER" },
    });
  });
});
