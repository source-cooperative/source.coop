import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Flex, Button } from "@radix-ui/themes";
import Link from "next/link";
import { getPageSession } from "@/lib/api/utils";
import { listDataConnections } from "@/lib/operations/data-connections";
import { FormTitle } from "@/components/core/FormTitle";
import { DataConnectionsList } from "@/components/features/data-connections";
import {
  accountDataConnectionCreateUrl,
  accountDataConnectionEditUrl,
} from "@/lib/urls";

export const metadata: Metadata = {
  title: "Data connections",
};

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountDataConnectionsPage({ params }: PageProps) {
  const { account_id } = await params;
  // Refused unless the visitor manages this account's connections.
  const result = await listDataConnections(await getPageSession(), {
    owner: account_id,
  });
  if (!result.ok) notFound();
  const connections = result.value.items;

  return (
    <Box>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <FormTitle
            title="Data Connections"
            description="Manage this account's connections to external storage."
          />
        </Box>
        <Button asChild size="2" highContrast>
          <Link href={accountDataConnectionCreateUrl(account_id)}>
            New Connection
          </Link>
        </Button>
      </Flex>

      <DataConnectionsList
        connections={connections}
        editHref={(id) => accountDataConnectionEditUrl(account_id, id)}
      />
    </Box>
  );
}
