import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("AdminUserLookup");
  return (
    <Box>
      <AdminUserSearchField query={query}>
        {search && (
          <Box mt="4">
            <Text as="p" size="2" color="gray" mb="2">
              {describe(t, search, query)}
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
                    {user.disabled && <Badge color="red">{t("disabled")}</Badge>}
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

function describe(
  t: ReturnType<typeof useTranslations<"AdminUserLookup">>,
  search: UserSearch,
  query: string
): string {
  if (search.source === "ory") {
    if (!search.identityFound) return t("oryNoIdentity", { query });
    if (search.results.length === 0) return t("oryNoProfile", { query });
    return t("oryResolved", { query });
  }
  return search.results.length === 0
    ? t("databaseNoMatch", { query })
    : t("databaseMatches", { query });
}
