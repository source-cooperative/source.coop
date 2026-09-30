import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Callout, Heading, Link as RadixLink } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccount } from "@/lib/api/authz";
import { accountsTable } from "@/lib/clients/database";
import { ADMIN_DIMENSIONS, type AdminDimension } from "@/lib/clients/analytics";
import { AccountTabs } from "@/components/features/analytics";
import { BreakdownExplorer } from "@/components/features/analytics/BreakdownExplorer";
import { accountAnalyticsUrl } from "@/lib/urls";

interface PageProps {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Every dimension except the one the URL already pins. */
const DIMENSIONS = (Object.keys(ADMIN_DIMENSIONS) as AdminDimension[]).filter(
  (dim) => dim !== "account",
);

/** Owners/maintainers/admins only; everyone else gets the same 404 an
 * unknown path would — including from generateMetadata, which streams
 * independently of the page body. */
async function authorizedAccount(account_id: string) {
  const account = await accountsTable.fetchById(account_id);
  if (!account || !canManageAccount(await getPageSession(), account)) {
    notFound();
  }
  return account;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const account = await authorizedAccount(account_id);
  return { title: `${account.name || account_id} — Analytics` };
}

export default async function AccountAnalyticsPage({
  params,
  searchParams,
}: PageProps) {
  const { account_id } = await params;
  const account = await authorizedAccount(account_id);

  return (
    <Box mt="4">
      <AccountTabs accountId={account_id} active="analytics" />
      <Heading size="7" my="4">
        {account.name || account_id}
      </Heading>

      <BreakdownExplorer
        baseUrl={accountAnalyticsUrl(account_id)}
        searchParams={await searchParams}
        dimensions={DIMENSIONS}
        scopeFilters={{ account: account_id }}
        notice={
          <Callout.Root color="blue" role="status">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Analytics is a preview feature. The metrics shown here and who can
              access them may change in the near future. Let us know what you
              think at{" "}
              <RadixLink href="mailto:hello@source.coop">
                hello@source.coop
              </RadixLink>
              .
            </Callout.Text>
          </Callout.Root>
        }
      />
    </Box>
  );
}
