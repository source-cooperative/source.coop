import { Membership } from "@/types";
import {
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
  model = "memberships";

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

  /**
   * Fetches all memberships for a given organization account.
   *
   * @param membershipAccountId The account ID of the organization.
   * @param repositoryId Optional repository ID to filter by.
   * @returns A list of memberships.
   */
  // TODO: support pagination
  // TODO: support filtering by state
  async listByAccount(
    membershipAccountId: string,
    repositoryId?: string,
    all: boolean = false
  ): Promise<Membership[]> {
    try {
      const query = repositoryId
        ? {
            IndexName: "membership_account_id_repository_id",
            KeyConditionExpression:
              "membership_account_id = :membership_account_id AND repository_id = :repository_id",
            ExpressionAttributeValues: {
              ":membership_account_id": membershipAccountId,
              ":repository_id": repositoryId,
            },
          }
        : all
        ? // If we want all memberships for an org, return records regardless of repository_id
          {
            IndexName: "membership_account_id",
            KeyConditionExpression:
              "membership_account_id = :membership_account_id",
            ExpressionAttributeValues: {
              ":membership_account_id": membershipAccountId,
            },
          }
        : // Otherwise, return only org-level memberships (no repository_id)
          {
            IndexName: "membership_account_id",
            KeyConditionExpression:
              "membership_account_id = :membership_account_id",
            ExpressionAttributeValues: {
              ":membership_account_id": membershipAccountId,
            },
            FilterExpression: "attribute_not_exists(repository_id)",
          };
      const command = new QueryCommand({
        TableName: this.table,
        ...query,
      });
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
          Item: {
            ...membership,
            // Remove repository_id if it's an empty string or undefined
            // DynamoDB doesn't allow empty strings as key values in indexes
            repository_id: membership.repository_id || undefined,
          },
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
      // Build UpdateExpression - only include repository_id if it exists
      const updateParts = [
        "account_id = :account_id",
        "membership_account_id = :membership_account_id",
        "#role = :role",
        "#state = :state",
        "state_changed = :state_changed",
      ];

      const expressionAttributeValues: Record<string, any> = {
        ":account_id": membership.account_id,
        ":membership_account_id": membership.membership_account_id,
        ":role": membership.role,
        ":state": membership.state,
        ":state_changed": membership.state_changed,
      };

      // Only include repository_id if it exists
      if (membership.repository_id !== undefined) {
        updateParts.push("repository_id = :repository_id");
        expressionAttributeValues[":repository_id"] = membership.repository_id;
      }

      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            membership_id: membership.membership_id,
          },
          UpdateExpression: `SET ${updateParts.join(", ")}`,
          ExpressionAttributeNames: {
            "#role": "role", // role is a reserved word in DynamoDB
            "#state": "state", // state is also a reserved word in DynamoDB
          },
          ExpressionAttributeValues: expressionAttributeValues,
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
}
export const membershipsTable = new MembershipsTable({});
