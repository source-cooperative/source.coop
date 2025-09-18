import { ReactNode } from "react";
import { SettingsLayout } from "./SettingsLayout";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { accountsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";

interface AccountSettingsLayoutWrapperProps {
  children: ReactNode;
  accountId: string;
  requiredPermission: Actions;
  additionalChecks?: (account: any) => boolean;
}

export async function AccountSettingsLayoutWrapper({
  children,
  accountId,
  requiredPermission,
  additionalChecks,
}: AccountSettingsLayoutWrapperProps) {
  const session = await getPageSession();
  
  if (!session?.account) {
    redirect("/auth/login");
  }

  const account = await accountsTable.fetchById(accountId);
  if (!account) {
    notFound();
  }

  // Check if user is authorized for the required permission
  if (!isAuthorized(session, account, requiredPermission)) {
    notFound();
  }

  // Run any additional checks
  if (additionalChecks && !additionalChecks(account)) {
    notFound();
  }

  return (
    <SettingsLayout
      accountId={accountId}
      accountType={account.type}
      canReadAccount={isAuthorized(session, account, Actions.GetAccount)}
      canReadMembership={isAuthorized(session, account, Actions.GetMembership)}
    >
      {children}
    </SettingsLayout>
  );
}
