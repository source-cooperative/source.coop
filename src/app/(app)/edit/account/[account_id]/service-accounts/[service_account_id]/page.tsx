import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Button } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { ServiceAccountDetail } from "@/components/features/service-accounts";
import {
  accountTrustsTable,
  membershipsTable,
  productsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { CONFIG } from "@/lib/config";
import { getPageSession } from "@/lib/api/utils";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { editAccountServiceAccountsUrl } from "@/lib/urls";
import { MembershipState } from "@/types";

export const metadata: Metadata = { title: "Service account" };

interface PageProps {
  params: Promise<{ account_id: string; service_account_id: string }>;
}

export default async function ServiceAccountPage({ params }: PageProps) {
  const { account_id, service_account_id } = await params;
  const account = await managedServiceAccount(await getPageSession(), service_account_id);
  // Reached only under its own owner, so the settings around it are that owner's.
  if (!account || account.owner_account_id !== account_id) notFound();

  const [trusts, memberships, products, keys] = await Promise.all([
    accountTrustsTable.listByAccount(account.account_id),
    membershipsTable.listByUser(account.account_id),
    productsTable.listByAccountAll(account_id),
    serviceAccountKeysTable.listByAccount(account.account_id),
  ]);

  return (
    <Box>
      <Button asChild variant="ghost" size="1" mb="4">
        <Link href={editAccountServiceAccountsUrl(account_id)}>
          <ArrowLeftIcon /> Service accounts
        </Link>
      </Button>
      <ServiceAccountDetail
        summary={{
          account,
          trusts,
          grants: memberships.filter((m) => m.state === MembershipState.Member),
          keys,
        }}
        products={products.map(({ product_id, title }) => ({ product_id, title }))}
        proxyOrigin={CONFIG.storage.endpoint}
      />
    </Box>
  );
}
