import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminUserLookup } from "@/components/features/admin/AdminUserLookup";
import { searchUsers } from "@/lib/api/user-lookup";
import { getPageSession } from "@/lib/api/utils";

export const metadata: Metadata = {
  title: "Admin — User lookup",
};

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

  return (
    <Box>
      <FormTitle
        title="User lookup"
        description="Find users by username, name, or email and open their profiles."
      />
      <AdminUserLookup query={q} search={search} />
    </Box>
  );
}
