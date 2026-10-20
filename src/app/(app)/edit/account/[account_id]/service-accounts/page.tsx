import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Button, Flex } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { FormTitle } from "@/components/core/FormTitle";
import { ServiceAccountList } from "@/components/features/service-accounts";
import {
  accountTrustsTable,
  membershipsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { listServiceAccounts } from "@/lib/operations/service-accounts";
import { createServiceAccountUrl } from "@/lib/urls";
import { MembershipState, publicKey, type ServiceAccountSummary } from "@/types";

export const metadata: Metadata = { title: "Service accounts" };

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ServiceAccountsPage({ params }: PageProps) {
  const { account_id } = await params;
  const listed = await listServiceAccounts(await getPageSession(), account_id);
  if (!listed.ok) notFound();

  const summaries: ServiceAccountSummary[] = await Promise.all(
    listed.value.items.map(async (account) => ({
      account,
      trusts: await accountTrustsTable.listByAccount(account.account_id),
      grants: (await membershipsTable.listByUser(account.account_id)).filter(
        (m) => m.state === MembershipState.Member
      ),
      keys: (await serviceAccountKeysTable.listByAccount(account.account_id)).map(publicKey),
    }))
  );

  return (
    <Box>
      <Flex justify="between" align="start" gap="3" mb="4">
        <FormTitle
          title="Service Accounts"
          description="Logins for software — a nightly sync, a publishing pipeline, an instrument — granted and revoked without sharing anyone's account."
        />
        <Button asChild size="2" highContrast>
          <Link href={createServiceAccountUrl(account_id)}>
            <PlusIcon width="16" height="16" /> New service account
          </Link>
        </Button>
      </Flex>
      <ServiceAccountList summaries={summaries} />
    </Box>
  );
}
