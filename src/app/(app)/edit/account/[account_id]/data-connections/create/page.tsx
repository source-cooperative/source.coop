import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flex, Heading } from "@radix-ui/themes";
import { DataConnectionForm } from "@/components/features/data-connections";
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
    <Flex direction="column" gap="4">
      <Heading size="4">Create Data Connection</Heading>
      <DataConnectionForm mode="create" ownerAccountId={account_id} />
    </Flex>
  );
}
