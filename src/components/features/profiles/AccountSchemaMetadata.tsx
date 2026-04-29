import type { Account } from "@/types";
import { accountUrl } from "@/lib/urls";
import { getBaseUrl } from "@/lib/baseUrl";

export async function AccountSchemaMetadata({ account }: { account: Account }) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${accountUrl(account.account_id)}`;

  const schemaData =
    account.type === "organization"
      ? {
          "@context": "https://schema.org/",
          "@type": "Organization",
          name: account.name,
          url,
          ...(account.metadata_public?.bio && {
            description: account.metadata_public.bio,
          }),
          ...(account.metadata_public?.profile_image && {
            image: account.metadata_public.profile_image,
          }),
          ...(account.metadata_public?.ror_id && {
            sameAs: `https://ror.org/${account.metadata_public.ror_id}`,
          }),
        }
      : {
          "@context": "https://schema.org/",
          "@type": "Person",
          name: account.name,
          url,
          ...(account.metadata_public?.bio && {
            description: account.metadata_public.bio,
          }),
          ...(account.metadata_public?.profile_image && {
            image: account.metadata_public.profile_image,
          }),
          ...(account.metadata_public?.orcid && {
            sameAs: `https://orcid.org/${account.metadata_public.orcid}`,
          }),
        };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
