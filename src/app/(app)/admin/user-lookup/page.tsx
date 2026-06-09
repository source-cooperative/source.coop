import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle, NotAuthorizedPage } from "@/components/core";
import { AdminUserLookupForm } from "@/components/features/admin/AdminUserLookupForm";
import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";

export const metadata: Metadata = {
  title: "Admin — User lookup",
};

export default async function AdminUserLookupPage() {
  const session = await getPageSession();
  if (!isAdmin(session)) {
    return <NotAuthorizedPage />;
  }

  return (
    <Box maxWidth="480px">
      <FormTitle
        title="User lookup"
        description="Find a user by email and open their profile."
      />
      <AdminUserLookupForm />
    </Box>
  );
}
