import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { AdminUserLookupForm } from "@/components/features/admin/AdminUserLookupForm";

export const metadata: Metadata = {
  title: "Admin — User lookup",
};

// Access is gated by the /admin layout.
export default function AdminUserLookupPage() {
  return (
    <Box>
      <FormTitle
        title="User lookup"
        description="Find a user by email and open their profile."
      />
      <AdminUserLookupForm />
    </Box>
  );
}
