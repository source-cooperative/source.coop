import { NotFoundPage } from "@/components/core";

export default async function AccountNotFound() {
  return (
    <NotFoundPage
      title="Account Not Found"
      description={"The requested account could not be found."}
    />
  );
}
