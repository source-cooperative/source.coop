import { Membership } from "@/types";
import {
  ConditionalCheckFailedException,
  PutItemCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { BaseTable } from "./base";

/**
 * Class for managing membership operations in DynamoDB
 */
export class MembershipsTable extends BaseTable {
  async fetchById(membershipId: string): Promise<Membership | null> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: "membership_id = :membership_id",
          ExpressionAttributeValues: {
            ":membership_id": membershipId,
          },
        })
      );
      return (result.Items?.[0] as Membership) ?? null;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;

      this.logError("fetchById", error, { membershipId });
      throw error;
    }
  }

  async listByUser(accountId: string): Promise<Membership[]> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: "account_id",
          KeyConditionExpression: "account_id = :account_id",
          ExpressionAttributeValues: {
            ":account_id": accountId,
          },
        })
      );
      return result.Items?.map((item) => item as Membership) ?? [];
    } catch (error) {
      this.logError("listByUser", error, { accountId });
      throw error;
    }
  }

  async listByAccount(
    membershipAccountId: string,
    repositoryId?: string
  ): Promise<Membership[]> {
    try {
      let command: QueryCommand;

      if (repositoryId) {
        command = new QueryCommand({
          TableName: this.table,
          IndexName: "membership_account_id_repository_id",
          KeyConditionExpression:
            "membership_account_id = :membership_account_id AND repository_id = :repository_id",
          ExpressionAttributeValues: {
            ":membership_account_id": membershipAccountId,
            ":repository_id": repositoryId,
          },
        });
      } else {
        command = new QueryCommand({
          TableName: this.table,
          IndexName: "membership_account_id",
          KeyConditionExpression:
            "membership_account_id = :membership_account_id",
          ExpressionAttributeValues: {
            ":membership_account_id": membershipAccountId,
          },
        });
      }

      const result = await this.client.send(command);
      return result.Items?.map((item) => item as Membership) ?? [];
    } catch (error) {
      this.logError("listByAccount", error, {
        membershipAccountId,
        repositoryId,
      });
      throw error;
    }
  }

  async create(membership: Membership): Promise<Membership> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: membership,
        })
      );
      return membership;
    } catch (error) {
      this.logError("create", error, {
        membershipId: membership.membership_id,
      });
      throw error;
    }
  }

  async update(membership: Membership): Promise<Membership> {
    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            membership_id: membership.membership_id,
          },
          UpdateExpression:
            "SET account_id = :account_id, membership_account_id = :membership_account_id, repository_id = :repository_id, role = :role, state = :state, state_changed = :state_changed",
          ExpressionAttributeValues: {
            ":account_id": membership.account_id,
            ":membership_account_id": membership.membership_account_id,
            ":repository_id": membership.repository_id,
            ":role": membership.role,
            ":state": membership.state,
            ":state_changed": membership.state_changed,
          },
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes as Membership;
    } catch (error) {
      this.logError("update", error, {
        membershipId: membership.membership_id,
      });
      throw error;
    }
  }

  // Legacy method for backward compatibility - renamed to upsert
  async upsert(
    membership: Membership,
    checkIfExists: boolean = false
  ): Promise<[Membership, boolean]> {
    try {
      const command = new PutItemCommand({
        TableName: this.table,
        Item: marshall(membership),
        ConditionExpression: checkIfExists
          ? "attribute_not_exists(membership_id)"
          : undefined,
      });

      await this.client.send(command);
      return [membership, true];
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return [membership, false];
      }
      this.logError("upsert", error, {
        membershipId: membership.membership_id,
      });
      throw error;
    }
  }
}
export const membershipsTable = new MembershipsTable({
  table: "sc-memberships",
});
