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
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { BaseTable } from "./base";

/**
 * Class for managing data connection operations in DynamoDB
 */
export class DataConnectionsTable extends BaseTable {
  model = "data-connections";

  async fetchById(dataConnectionId: string): Promise<DataConnection | null> {
    try {
      const result = await this.cachedSend(
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
      const result = await this.cachedSend(
        new ScanCommand({
          TableName: this.table,
          ConsistentRead: true,
        })
      );
      // Copy before sorting: the response may be a shared, request-cached object,
      // so we must not sort `result.Items` in place.
      return (
        [...(result.Items ?? [])]
          .sort((a, b) =>
            b.data_connection_id.localeCompare(a.data_connection_id)
          )
          .map((item) => item as DataConnection)
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
          // Guard against a concurrent create racing the caller's existence
          // check and silently overwriting a live connection.
          ConditionExpression: "attribute_not_exists(data_connection_id)",
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
      // `name` is a DynamoDB reserved word, so it must be aliased. Optional
      // fields that are `undefined` are REMOVEd rather than SET: the document
      // client strips undefined values (removeUndefinedValues), which would
      // otherwise leave the SET expression referencing a missing value.
      const names: Record<string, string> = { "#name": "name" };
      const values: Record<string, unknown> = {
        ":name": dataConnection.name,
        ":read_only": dataConnection.read_only,
        ":allowed_visibilities": dataConnection.allowed_visibilities,
        ":details": dataConnection.details,
      };
      const setClauses = [
        "#name = :name",
        "read_only = :read_only",
        "allowed_visibilities = :allowed_visibilities",
        "details = :details",
      ];
      const removeClauses: string[] = [];

      const optionalFields: Array<[string, unknown]> = [
        ["prefix_template", dataConnection.prefix_template],
        ["required_flag", dataConnection.required_flag],
        ["authentication", dataConnection.authentication],
      ];
      for (const [field, value] of optionalFields) {
        if (value === undefined) {
          removeClauses.push(field);
        } else {
          setClauses.push(`${field} = :${field}`);
          values[`:${field}`] = value;
        }
      }

      let updateExpression = `SET ${setClauses.join(", ")}`;
      if (removeClauses.length > 0) {
        updateExpression += ` REMOVE ${removeClauses.join(", ")}`;
      }

      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            data_connection_id: dataConnection.data_connection_id,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
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

  async delete(dataConnectionId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.table,
          Key: {
            data_connection_id: dataConnectionId,
          },
        })
      );
    } catch (error) {
      this.logError("delete", error, { dataConnectionId });
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
export const dataConnectionsTable = new DataConnectionsTable({});
