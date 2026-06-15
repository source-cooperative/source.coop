import { redirect } from "next/navigation";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";

// Land admins on the first available tool; the sidebar (rendered by the admin
// layout) lets them switch between tools.
export default function AdminPage() {
  redirect(ADMIN_TOOLS[0].href);
}
