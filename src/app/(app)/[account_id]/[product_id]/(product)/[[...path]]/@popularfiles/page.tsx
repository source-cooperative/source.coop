import { PopularFilesSidebar } from "@/components/features/analytics/PopularFilesSidebar";
import { getPopularFiles, type Period } from "@/lib/clients/analytics";

function parsePeriod(value: string | undefined): Period {
  const num = Number(value);
  if (num === 7 || num === 30 || num === 90) return num;
  return 7;
}

interface PageProps {
  params: Promise<{ account_id: string; product_id: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function PopularFilesSlot({
  params,
  searchParams,
}: PageProps) {
  const { account_id, product_id } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  const popularFiles = await getPopularFiles(account_id, product_id, period);

  return (
    <PopularFilesSidebar
      files={popularFiles}
      accountId={account_id}
      productId={product_id}
    />
  );
}
