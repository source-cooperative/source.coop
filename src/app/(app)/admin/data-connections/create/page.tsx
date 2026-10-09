import { Metadata } from "next";
import { Flex, Heading } from "@radix-ui/themes";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { DataConnectionForm } from "@/components/features/data-connections";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminCreateDataConnectionPage");
  return { title: t("metaTitle") };
}

export default function CreateDataConnectionPage() {
  const t = useTranslations("AdminCreateDataConnectionPage");
  return (
    <Flex direction="column" gap="4">
      <Heading size="4">{t("title")}</Heading>
      <DataConnectionForm mode="create" />
    </Flex>
  );
}
