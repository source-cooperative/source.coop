import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";
import { ProfileImageUpload } from "@/components/features/profiles/ProfileImageUpload";
import { accountsTable } from "@/lib/clients/database";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const t = await getTranslations("EditAccountProfilePicturePage");
  return { title: t("metaTitle", { name: account!.name }) };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ProfilePicturePage({ params }: PageProps) {
  const { account_id } = await params;

  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }

  const t = await getTranslations("EditAccountProfilePicturePage");

  return (
    <Box>
      <FormTitle
        title={t("title")}
        description={
          account.type === "individual"
            ? t("descriptionIndividual")
            : t("descriptionOrganization")
        }
      />
      <ProfileImageUpload account={account} />
    </Box>
  );
}
