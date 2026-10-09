import { getTranslations } from "next-intl/server";
import { NotFoundPage } from "@/components/core";

export default async function AccountNotFound() {
  const t = await getTranslations("AccountNotFoundPage");
  return <NotFoundPage title={t("title")} description={t("description")} />;
}
