import { OrganizationCreationForm } from "@/components/features/organizations/OrganizationCreationForm";
import { FormTitle } from "@/components/core";
import { getPageSession } from "@/lib/api/utils";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Container, Heading, Text } from "@radix-ui/themes";
import { newOrganizationUrl } from "@/lib/urls";

interface PageProps {
  params: Promise<{
    account_id: string;
  }>;
}

export default async function NewOrganizationPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const t = await getTranslations("NewOrganizationPage");

  if (!session?.account) {
    return (
      <Container size="2" py="6">
        <Heading size="6" mb="4">
          {t("accessDenied")}
        </Heading>

        <Text as="p" size="3" color="gray" className="mb-4">
          {t("loginRequired")}
        </Text>
      </Container>
    );
  }

  if (session.account.account_id !== account_id) {
    redirect(newOrganizationUrl(session.account.account_id));
  }

  return (
    <>
      <FormTitle
        title={t("title")}
        description={t("description")}
      />
      <OrganizationCreationForm ownerAccountId={session.account.account_id} />
    </>
  );
}
