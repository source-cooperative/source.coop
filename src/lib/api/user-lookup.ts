import { LOGGER } from "@/lib/logging";
import { getOryIdentityIdByEmail } from "./utils";
import { accountsTable } from "../clients";
import type { AccountSuggestion } from "../clients/database/accounts";

/**
 * Where a search went and what came back, so the tool can say which system
 * answered: an email is one Ory identity that may or may not have a profile;
 * anything else is a substring match over the accounts table.
 */
export type UserSearch =
  | { source: "database"; results: AccountSuggestion[] }
  | { source: "ory"; identityFound: boolean; results: AccountSuggestion[] };

/**
 * Admin user search. Disabled accounts are included, since an admin is as
 * likely to be looking for one of those. Caller is responsible for the admin
 * check.
 */
export async function searchUsers(
  query: string,
  lookedUpBy?: string,
): Promise<UserSearch> {
  const q = query.trim();
  const search = await (q.includes("@") ? viaOry(q) : viaDatabase(q));

  LOGGER.info("Admin searched for users", {
    operation: "searchUsers",
    context: "admin",
    metadata: {
      source: search.source,
      matches: search.results.length,
      looked_up_by: lookedUpBy,
    },
  });

  return search;
}

async function viaOry(email: string): Promise<UserSearch> {
  const identityId = await getOryIdentityIdByEmail(email);
  const account = identityId && (await accountsTable.fetchByOryId(identityId));
  return {
    source: "ory",
    identityFound: Boolean(identityId),
    results: account
      ? [
          {
            account_id: account.account_id,
            name: account.name,
            type: account.type,
            profile_image: account.metadata_public?.profile_image,
            ...(account.disabled && { disabled: true }),
          },
        ]
      : [],
  };
}

async function viaDatabase(q: string): Promise<UserSearch> {
  return {
    source: "database",
    results: q
      ? await accountsTable.searchMemberCandidates(q, undefined, {
          includeDisabled: true,
        })
      : [],
  };
}
