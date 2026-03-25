import { ProductAnalytics } from "@/components/features/analytics/ProductAnalytics";
import { getProductAnalytics, type Period } from "@/lib/clients/analytics";

function parsePeriod(value: string | undefined): Period {
  const num = Number(value);
  if (num === 7 || num === 30 || num === 90) return num;
  return 7;
}

interface PageProps {
  params: Promise<{ account_id: string; product_id: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function ProductAnalyticsSlot({
  params,
  searchParams,
}: PageProps) {
  const { account_id, product_id } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  const data = await getProductAnalytics(account_id, product_id, period);

  return <ProductAnalytics data={data} period={period} />;
}
