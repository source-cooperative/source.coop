import { S3CredentialsProvider } from "@/components";

interface ProductLayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: ProductLayoutProps) {
  return <S3CredentialsProvider>{children}</S3CredentialsProvider>;
}
