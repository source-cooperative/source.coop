import type { Repository, RepositoryStatistics } from '@/types/repository';
import type { Account } from '@/types/account';

// For injecting schema.org metadata
export function RepositorySchemaMetadata({ 
  repository, 
  account,
  statistics 
}: { 
  repository: Repository; 
  account?: Account;
  statistics?: RepositoryStatistics;
}) {
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    "name": repository.title,
    "description": repository.description,
    "url": `https://yourdomain.com/${repository.account_id}/${repository.repository_id}`,
    "dateModified": repository.updated_at,
    "dateCreated": repository.created_at,
    "isAccessibleForFree": !repository.private,
    ...(statistics && {
      "contentSize": `${statistics.total_bytes} bytes`,
      "datePublished": statistics.first_object_at
    }),
    ...(repository.root_metadata?.license && {
      "license": repository.root_metadata.license
    }),
    ...(account && {
      "creator": {
        "@type": account.type === 'organization' ? "Organization" : "Person",
        "name": account.name,
        ...(account.website && { "url": account.website })
      }
    })
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
} 