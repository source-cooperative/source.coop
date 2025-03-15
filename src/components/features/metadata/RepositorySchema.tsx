import type { Repository, RepositoryStatistics } from '@/types';

interface RepositorySchemaProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export function RepositorySchema({ repository, statistics }: RepositorySchemaProps) {
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    "name": repository.title,
    "description": repository.description,
    "url": `https://source.coop/${repository.account.account_id}/${repository.repository_id}`,
    "dateModified": repository.updated_at,
    "dateCreated": repository.created_at,
    "isAccessibleForFree": !repository.private,
    ...(repository.root_metadata?.license && {
      "license": repository.root_metadata.license
    }),
    "creator": {
      "@type": repository.account.type === 'organization' ? "Organization" : "Person",
      "name": repository.account.name,
      ...(repository.account.website && { "url": repository.account.website })
    }
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
} 