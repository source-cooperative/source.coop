import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { NotAuthorizedPage } from "@/components/core";

// Gates every route under /admin. Child pages can assume the visitor is an
// admin and focus on their own content.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPageSession();
  if (!isAdmin(session)) {
    return <NotAuthorizedPage />;
  }
  return <>{children}</>;
}
