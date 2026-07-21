import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { DataConnectionForm } from "@/components/features/data-connections";
import { FormTitle } from "@/components/core/FormTitle";
import { accountsTable } from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountDataConnections } from "@/lib/api/authz";

export const metadata: Metadata = {
  title: "Create data connection",
};

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountCreateDataConnectionPage({
  params,
}: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);
  if (!account || !canManageAccountDataConnections(session, account)) {
    notFound();
  }

  return (
    <Box>
      <FormTitle
        title="Create Data Connection"
        description="Connect external storage this account's products can mirror to."
      />
      <DataConnectionForm mode="create" ownerAccountId={account_id} />
    </Box>
  );
}
