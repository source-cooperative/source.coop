import { ReactNode } from "react";
import { AccountSettingsLayoutWrapper } from "@/components/features/settings/AccountSettingsLayoutWrapper";
import { Actions } from "@/types";

interface ProfileLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string }>;
}

export default async function ProfileLayout({
  children,
  params,
}: ProfileLayoutProps) {
  const { account_id } = await params;

      return (
        <AccountSettingsLayoutWrapper
          accountId={account_id}
          requiredPermission={Actions.PutAccountProfile}
          currentSettingType="profile"
        >
          {children}
        </AccountSettingsLayoutWrapper>
      );
}
