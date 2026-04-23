import { ReactNode } from "react";
import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { notFound } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { redirect } from "next/navigation";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getPageSession();

  if (!session?.account) {
    redirect(CONFIG.auth.routes.login);
  }

  if (!isAdmin(session)) {
    notFound();
  }

  return <>{children}</>;
}
