import { BreadcrumbNav } from "@/components/display";

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
  path?: string[];
}

interface PageProps {
  params: Promise<ProductPathComponentProps>;
}

export default async function ProductPathPage({ params }: PageProps) {
  let { account_id, product_id, path } = await params;
  path = path?.map((p) => decodeURIComponent(p)) || [];
  return <BreadcrumbNav path={path} baseUrl={`/${account_id}/${product_id}`} />;
}
