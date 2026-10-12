import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Button, Flex } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { getTranslations } from "next-intl/server";
import { FormTitle } from "@/components/core/FormTitle";
import { ServiceAccountList } from "@/components/features/service-accounts";
import {
  accountsTable,
  accountTrustsTable,
  membershipsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountServiceAccounts } from "@/lib/api/authz";
import { createServiceAccountUrl } from "@/lib/urls";
import { MembershipState, publicKey, type ServiceAccountSummary } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ServiceAccountsPage");
  return { title: t("metaTitle") };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ServiceAccountsPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const owner = await accountsTable.fetchById(account_id);
  if (!owner || !canManageAccountServiceAccounts(session, owner)) {
    notFound();
  }

  const accounts = await accountsTable.listByOwner(account_id);
  const summaries: ServiceAccountSummary[] = await Promise.all(
    accounts.map(async (account) => ({
      account,
      trusts: await accountTrustsTable.listByAccount(account.account_id),
      grants: (await membershipsTable.listByUser(account.account_id)).filter(
        (m) => m.state === MembershipState.Member
      ),
      keys: (await serviceAccountKeysTable.listByAccount(account.account_id)).map(publicKey),
    }))
  );
  const t = await getTranslations("ServiceAccountsPage");

  return (
    <Box>
      <Flex justify="between" align="start" gap="3" mb="4">
        <FormTitle
          title={t("title")}
          description={t("description")}
        />
        <Button asChild size="2" highContrast>
          <Link href={createServiceAccountUrl(account_id)}>
            <PlusIcon width="16" height="16" /> {t("newServiceAccount")}
          </Link>
        </Button>
      </Flex>
      <ServiceAccountList summaries={summaries} />
    </Box>
  );
}
