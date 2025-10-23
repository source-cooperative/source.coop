import { S3CredentialsProvider } from "@/components";
import { UploadProvider } from "@/components/features/products/uploader/UploadProvider";

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    account_id: string;
    product_id: string;
  }>;
}

export default async function Layout({ children, params }: ProductLayoutProps) {
  return (
    <S3CredentialsProvider>
      <UploadProvider>{children}</UploadProvider>
    </S3CredentialsProvider>
  );
}
