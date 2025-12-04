import {
  OpenGraphImage,
  ogImageSize,
  ogImageContentType,
} from "@/components/og/OpenGraphImage";
import { accountsTable } from "@/lib/clients/database";

export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ account_id: string }>;
}) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const accountName = account?.name || "Account";

  return OpenGraphImage({
    title: accountName,
    subtitle: undefined,
  });
}
