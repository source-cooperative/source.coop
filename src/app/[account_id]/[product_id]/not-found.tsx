import { NotFoundPage } from "@/components/core";

interface NotFoundProps {
  params?: {
    account_id?: string;
    product_id?: string;
  };
}

export default function NotFound({ params }: NotFoundProps) {
  return (
    <NotFoundPage
      title="Product Not Found"
      description={
        params?.account_id && params?.product_id ? (
          <>
            The product <strong>{params.product_id}</strong> was not found in
            the account <strong>{params.account_id}</strong>.
          </>
        ) : (
          "The requested product could not be found."
        )
      }
      containerSize="2"
      minHeight="60vh"
    />
  );
}
