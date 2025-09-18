import { ReactNode } from "react";
import { AccountSettingsLayoutWrapper } from "@/components/features/settings/AccountSettingsLayoutWrapper";
import { Actions } from "@/types";

interface SecurityLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string }>;
}

export default async function SecurityLayout({
  children,
  params,
}: SecurityLayoutProps) {
  const { account_id } = await params;

  return (
    <AccountSettingsLayoutWrapper
      accountId={account_id}
      requiredPermission={Actions.GetAccount}
    >
      {children}
    </AccountSettingsLayoutWrapper>
  );
}
