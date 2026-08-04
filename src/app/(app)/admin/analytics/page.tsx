import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flex, Heading } from "@radix-ui/themes";
import { getPageSession } from "@/lib";
import { isAdmin } from "@/lib/api/authz";
import {
  ADMIN_DIMENSIONS,
  type AdminDimension,
} from "@/lib/clients/analytics";
import { BreakdownExplorer } from "@/components/features/analytics/BreakdownExplorer";
import { adminAnalyticsUrl } from "@/lib";

export const metadata: Metadata = { title: "Admin — Analytics" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  // The admin layout renders NotAuthorizedPage, but layouts aren't an auth
  // boundary (they render in parallel with pages and don't re-render on
  // soft navigation) — gate the data work here too.
  if (!isAdmin(await getPageSession())) {
    notFound();
  }

  return (
    // The account view titles itself with the account name; only the admin
    // tool needs a heading naming the page.
    <Flex direction="column" gap="4">
      <Heading size="4">Analytics</Heading>
      <BreakdownExplorer
        baseUrl={adminAnalyticsUrl()}
        searchParams={await searchParams}
        dimensions={Object.keys(ADMIN_DIMENSIONS) as AdminDimension[]}
        showSql
      />
    </Flex>
  );
}
