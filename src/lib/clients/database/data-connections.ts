import { DataConnection } from "@/types";
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { BaseTable } from "./base";

/**
 * Class for managing data connection operations in DynamoDB
 */
export class DataConnectionsTable extends BaseTable {
  async fetchById(dataConnectionId: string): Promise<DataConnection | null> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: "data_connection_id = :data_connection_id",
          ExpressionAttributeValues: {
            ":data_connection_id": dataConnectionId,
          },
        })
      );
      return (result.Items?.[0] as DataConnection) ?? null;
    } catch (error) {
      this.logError("fetchById", error, { dataConnectionId });
      throw error;
    }
  }

  async listAll(): Promise<DataConnection[]> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.table,
          ConsistentRead: true,
        })
      );
      return (
        result.Items?.sort((a, b) =>
          b.data_connection_id.localeCompare(a.data_connection_id)
        ).map((item) => item as DataConnection) ?? []
      );
    } catch (error) {
      this.logError("listAll", error);
      throw error;
    }
  }

  async create(
    dataConnection: DataConnection,
    checkIfExists: boolean = false
  ): Promise<[DataConnection, boolean]> {
    try {
      const command = new PutItemCommand({
        TableName: this.table,
        Item: marshall(dataConnection),
        ConditionExpression: checkIfExists
          ? "attribute_not_exists(data_connection_id)"
          : undefined,
      });

      await this.client.send(command);
      return [dataConnection, true];
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return [dataConnection, false];
      }
      this.logError("create", error, {
        dataConnectionId: dataConnection.data_connection_id,
      });
      throw error;
    }
  }
}
export const dataConnectionsTable = new DataConnectionsTable({
  table: "sc-data-connections",
});
