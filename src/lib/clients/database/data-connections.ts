import { DataConnection } from "@/types";
import {
  PutItemCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
  QueryCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
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
      if (error instanceof ResourceNotFoundException) return null;

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

  async create(dataConnection: DataConnection): Promise<DataConnection> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: dataConnection,
        })
      );
      return dataConnection;
    } catch (error) {
      this.logError("create", error, {
        dataConnectionId: dataConnection.data_connection_id,
      });
      throw error;
    }
  }

  async update(dataConnection: DataConnection): Promise<DataConnection> {
    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            data_connection_id: dataConnection.data_connection_id,
          },
          UpdateExpression:
            "SET name = :name, prefix_template = :prefix_template, read_only = :read_only, allowed_data_modes = :allowed_data_modes, required_flag = :required_flag, details = :details, authentication = :authentication",
          ExpressionAttributeValues: {
            ":name": dataConnection.name,
            ":prefix_template": dataConnection.prefix_template,
            ":read_only": dataConnection.read_only,
            ":allowed_data_modes": dataConnection.allowed_data_modes,
            ":required_flag": dataConnection.required_flag,
            ":details": dataConnection.details,
            ":authentication": dataConnection.authentication,
          },
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes as DataConnection;
    } catch (error) {
      this.logError("update", error, {
        dataConnectionId: dataConnection.data_connection_id,
      });
      throw error;
    }
  }

  // Legacy method for backward compatibility - renamed to upsert
  async upsert(
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
      this.logError("upsert", error, {
        dataConnectionId: dataConnection.data_connection_id,
      });
      throw error;
    }
  }
}
export const dataConnectionsTable = new DataConnectionsTable({
  table: "sc-data-connections",
});
