import { NotFoundPage } from "@/components/core";

interface NotFoundProps {
  params?: {
    account_id?: string;
    product_id?: string;
  };
}

export default function NotFound({ params }: NotFoundProps) {
  if (params?.account_id && params?.product_id) {
    return (
      <NotFoundPage
        title="Product Not Found"
        description={`The product ${params.product_id} was not found in the account ${params.account_id}.`}
      />
    );
  }
  return <NotFoundPage title="Not Found" />;
}
