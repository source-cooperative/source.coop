import {
  OpenGraphImage,
  ogImageSize,
  ogImageContentType,
} from "@/components/og/OpenGraphImage";
import { accountsTable } from "@/lib/clients/database";
import { AccountType } from "@/types/account";
import { getProfileImage } from "@/lib/api/utils";
import { accountUrl } from "@/lib";

export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ account_id: string }>;
}) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);

  if (!account) {
    return OpenGraphImage({ title: "Account Not Found" });
  }

  const accountName = account.name;
  const bio = account.metadata_public.bio;
  const accountTypeLabel =
    account.type === AccountType.INDIVIDUAL ? "Individual" : "Organization";

  // Get avatar URL from Gravatar
  let avatarUrl: string | undefined;
  if (account.type === AccountType.INDIVIDUAL) {
    const primaryEmail = account.emails?.find((e) => e.is_primary)?.address;
    if (primaryEmail) {
      avatarUrl = `${getProfileImage(primaryEmail)}?d=identicon&s=200`;
    }
  }

  return OpenGraphImage({
    title: accountName,
    subtitle: bio,
    footer: accountTypeLabel,
    avatarUrl,
    url: accountUrl(account_id),
  });
}
