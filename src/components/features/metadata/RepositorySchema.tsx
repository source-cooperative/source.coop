import type { Repository } from '@/types';

interface RepositorySchemaProps {
  repository: Repository;
}

export function RepositorySchema({ repository }: RepositorySchemaProps) {
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
      ...(repository.account.websites && { "url": repository.account.websites[0] })
    }
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
} 