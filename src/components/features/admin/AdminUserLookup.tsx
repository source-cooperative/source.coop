import Link from "next/link";
import { Avatar, Badge, Box, Flex, Text } from "@radix-ui/themes";
import {
  AccountIdentity,
  accountCardSurface,
} from "@/components/core/AccountIdentity";
import type { UserSearch } from "@/lib/api/user-lookup";
import { accountUrl } from "@/lib/urls";
import { AdminUserSearchField } from "./AdminUserSearchField";

interface AdminUserLookupProps {
  /** The query from the URL. */
  query: string;
  /** The outcome for `query`; `undefined` until something has been searched. */
  search?: UserSearch;
}

/**
 * The admin user-lookup tool. Typing searches as you go; every match is a card
 * linking to that user's profile, under a line saying which system answered,
 * since "not found" means something different from Ory than from the database.
 */
export function AdminUserLookup({ query, search }: AdminUserLookupProps) {
  return (
    <Box>
      <AdminUserSearchField query={query}>
        {search && (
          <Box mt="4">
            <Text as="p" size="2" color="gray" mb="2">
              {describe(search, query)}
            </Text>
            <Flex direction="column" gap="2">
              {search.results.map((user) => (
                <Link
                  key={user.account_id}
                  href={accountUrl(user.account_id)}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Flex
                    align="center"
                    justify="between"
                    p="3"
                    style={accountCardSurface}
                  >
                    <AccountIdentity
                      name={user.name || user.account_id}
                      accountId={user.account_id}
                      size="2"
                      avatar={
                        <Avatar
                          size="2"
                          radius="full"
                          src={user.profile_image}
                          fallback={(user.name ||
                            user.account_id)[0].toUpperCase()}
                        />
                      }
                    />
                    {user.disabled && <Badge color="red">Disabled</Badge>}
                  </Flex>
                </Link>
              ))}
            </Flex>
          </Box>
        )}
      </AdminUserSearchField>
    </Box>
  );
}

function describe(search: UserSearch, query: string): string {
  const q = `“${query}”`;
  if (search.source === "ory") {
    if (!search.identityFound)
      return `Ory has no identity with the email ${q}.`;
    if (search.results.length === 0)
      return `Ory has an identity with the email ${q}, but it has no source.coop profile.`;
    return `Resolved the email ${q} through Ory.`;
  }
  return search.results.length === 0
    ? `No account handle or display name in the database contains ${q}.`
    : `Handles and display names in the database containing ${q}.`;
}
