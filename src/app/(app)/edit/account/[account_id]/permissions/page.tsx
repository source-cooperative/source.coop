import { Metadata } from "next";
import { FormTitle } from "@/components/core/FormTitle";
import { AccountFlagsForm } from "@/components/features/accounts/AccountFlagsForm";
import { accountsTable } from "@/lib/clients";
import { Box } from "@radix-ui/themes";
import { getPageSession } from "@/lib/api/utils";
import { NotAuthorizedPage } from "@/components/core";
import { notFound } from "next/navigation";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const t = await getTranslations("EditAccountPermissionsPage");
  return { title: t("metaTitle", { name: account!.name }) };
}
interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function PermissionsPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  if (!session?.account) {
    return <NotAuthorizedPage />;
  }
  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }
  if (!isAuthorized(session, account, Actions.GetAccountFlags)) {
    return <NotAuthorizedPage />;
  }
  const t = await getTranslations("EditAccountPermissionsPage");
  return (
    <Box>
      <FormTitle
        title={t("title")}
        description={t("description")}
      />
      <AccountFlagsForm session={session} account={account} />
    </Box>
  );
}
