/**
 * Account Page - Displays account details and products
 *
 * This server component handles both individual and organizational accounts.
 * It fetches account data, products, and organization members (if applicable).
 *
 * @param params - Route parameters containing account_id
 * @param searchParams - URL search parameters, including welcome flag for onboarding
 * @returns Rendered profile component based on account type
 * @throws {notFound} If account does not exist
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizationProfilePage } from "@/app/(app)/[account_id]/OrganizationProfilePage";
import { Actions, isServiceAccount } from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { getPageSession } from "@/lib/api/utils";
import { accountsTable, isOrganizationalAccount } from "@/lib/clients/database";
import { IndividualProfilePage } from "./IndividualProfilePage";
import {
  generateNotFoundMetadata,
  generateAccountMetadata,
} from "@/components/features/metadata";
import { AccountSchemaMetadata } from "@/components/features/profiles/AccountSchemaMetadata";

type PageProps = {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const [account, session] = await Promise.all([
    accountsTable.fetchById(account_id),
    getPageSession(),
  ]);
  if (!account || !isAuthorized(session, account, Actions.GetAccountProfile)) {
    return generateNotFoundMetadata();
  }
  return generateAccountMetadata({ account });
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { account_id } = await params;
  const showWelcome = Object.hasOwn(await searchParams, "welcome");

  const [account, session] = await Promise.all([
    accountsTable.fetchById(account_id),
    getPageSession(),
  ]);
  // A service account has no public profile, and a disabled account shows
  // only to its members.
  if (
    !account ||
    isServiceAccount(account) ||
    !isAuthorized(session, account, Actions.GetAccountProfile)
  ) {
    notFound();
  }

  return (
    <>
      <AccountSchemaMetadata account={account} />
      {isOrganizationalAccount(account) ? (
        <OrganizationProfilePage account={account} />
      ) : (
        <IndividualProfilePage account={account} showWelcome={showWelcome} />
      )}
    </>
  );
}
