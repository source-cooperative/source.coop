import { ProductAnalytics } from "@/components/features/analytics/ProductAnalytics";
import { getProductAnalytics, getPopularFiles, type Period } from "@/lib/clients/analytics";

function parsePeriod(value: string | undefined): Period {
  const num = Number(value);
  if (num === 7 || num === 30 || num === 90) return num;
  return 7;
}

interface PageProps {
  params: Promise<{ account_id: string; product_id: string; path?: string[] }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function ProductAnalyticsSlot({
  params,
  searchParams,
}: PageProps) {
  const { account_id, product_id, path } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  const filePath = path?.map((p) => decodeURIComponent(p)).join("/") || undefined;

  const [data, popularFiles] = await Promise.all([
    getProductAnalytics(account_id, product_id, period, filePath),
    filePath
      ? Promise.resolve([])
      : getPopularFiles(account_id, product_id, period),
  ]);

  return (
    <ProductAnalytics
      data={data}
      popularFiles={popularFiles}
      accountId={account_id}
      productId={product_id}
      period={period}
    />
  );
}
