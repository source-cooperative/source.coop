import { NotFoundPage } from "@/components/core";

interface NotFoundProps {
  params?: {
    account_id?: string;
  };
}

export default function AccountNotFound({ params }: NotFoundProps) {
  return (
    <NotFoundPage
      title="Account Not Found"
      description={
        params?.account_id ? (
          <>
            The account <strong>{params.account_id}</strong> could not be found.
            <br />
            <br />
            If you just created this account, please try refreshing the page.
          </>
        ) : (
          "The requested account could not be found."
        )
      }
      actionText="Return to Home"
      iconSize={32}
      minHeight="60vh"
    />
  );
}
