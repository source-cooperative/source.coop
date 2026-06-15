import { ReactNode } from "react";
import { Heading } from "@radix-ui/themes";
import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { NotAuthorizedPage } from "@/components/core";
import { SettingsHeader, SettingsLayout } from "@/components/features/settings";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";

// Gates every route under /admin and presents the admin tools in a settings-
// style layout (left sidebar menu + content area), matching the account and
// product edit views. Child pages can assume the visitor is an admin and focus
// on their own content.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getPageSession();
  if (!isAdmin(session)) {
    return <NotAuthorizedPage />;
  }

  const menuItems = ADMIN_TOOLS.map((tool) => ({
    id: tool.href,
    label: tool.name,
    href: tool.href,
    icon: <tool.Icon width="16" height="16" />,
    condition: true,
  }));

  return (
    <>
      <SettingsHeader>
        <Heading size="5">Admin</Heading>
      </SettingsHeader>
      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
