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
import { OrganizationProfilePage } from "@/app/[account_id]/OrganizationProfilePage";
import { accountsTable, isOrganizationalAccount } from "@/lib/clients/database";
import { IndividualProfilePage } from "./IndividualProfilePage";
import {
  generateNotFoundMetadata,
  generateAccountMetadata,
} from "@/components/features/metadata";

type PageProps = {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    return generateNotFoundMetadata();
  }
  return generateAccountMetadata({ account });
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { account_id } = await params;
  const showWelcome = Object.hasOwn(await searchParams, "welcome");

  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }

  return isOrganizationalAccount(account) ? (
    <OrganizationProfilePage account={account} />
  ) : (
    <IndividualProfilePage account={account} showWelcome={showWelcome} />
  );
}
