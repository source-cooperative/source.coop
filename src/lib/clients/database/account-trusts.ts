import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { AccountTrust } from "@/types";
import { BaseTable } from "./base";

/**
 * The sort key: an issuer and a subject as one string. An issuer is a URL and
 * so has no space, which makes the first space the boundary whatever the
 * subject contains. The key is only ever composed, never split.
 */
export const identityKey = (issuer: string, subject: string) => `${issuer} ${subject}`;

/**
 * Which subjects each account trusts to act as it, keyed by the account so
 * the question the exchange asks — "does *this* account trust *this*
 * subject?" — is one exact read, and an account's trusts are one query. An
 * individual's Ory identity is not here: it stays on the account row as
 * `identity_id`. Nor is an API key's subject, which is the service account's
 * own id and resolves by id.
 */
export class AccountTrustsTable extends BaseTable {
  model = "account-trusts";

  async isTrusted(account_id: string, issuer: string, subject: string): Promise<boolean> {
    try {
      const result = await this.cachedSend(
        new GetCommand({
          TableName: this.table,
          Key: { account_id, identity: identityKey(issuer, subject) },
        })
      );
      return result.Item !== undefined;
    } catch (error) {
      this.logError("isTrusted", error, { account_id, issuer, subject });
      throw error;
    }
  }

  /**
   * An account's trusts. A destructive caller passes `bypassCache` so it acts
   * on what the table holds now, not on a read memoized earlier in the
   * request that may predate one.
   */
  async listByAccount(account_id: string, bypassCache = false): Promise<AccountTrust[]> {
    const trusts: AccountTrust[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const command = new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "account_id = :account_id",
        ExpressionAttributeValues: { ":account_id": account_id },
        ExclusiveStartKey,
      });
      const result = bypassCache
        ? await this.client.send(command)
        : await this.cachedSend(command);
      trusts.push(...((result.Items ?? []) as AccountTrust[]));
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return trusts;
  }
}

export const accountTrustsTable = new AccountTrustsTable({});
