import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { getTranslations } from "next-intl/server";
import { FormTitle } from "@/components/core";
import { AdminUserLookup } from "@/components/features/admin/AdminUserLookup";
import { searchUsers } from "@/lib/api/user-lookup";
import { getPageSession } from "@/lib/api/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminUserLookupPage");
  return { title: t("metaTitle") };
}

// Access is gated by the /admin layout.
export default async function AdminUserLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const search = q
    ? await searchUsers(q, (await getPageSession())?.account?.account_id)
    : undefined;
  const t = await getTranslations("AdminUserLookupPage");

  return (
    <Box>
      <FormTitle
        title={t("title")}
        description={t("description")}
      />
      <AdminUserLookup query={q} search={search} />
    </Box>
  );
}
