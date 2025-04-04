import type { Repository, RepositoryStatistics } from '@/types';

// For injecting schema.org metadata
export function RepositorySchemaMetadata({ 
  repository, 
  statistics 
}: { 
  repository: Repository;
  statistics?: RepositoryStatistics;
}) {
  const account = repository.account;
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    "name": repository.title,
    "description": repository.description,
    "url": account ? `https://yourdomain.com/${account.account_id}/${repository.repository_id}` : '',
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
        ...(account.websites && { "url": account.websites[0] })
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