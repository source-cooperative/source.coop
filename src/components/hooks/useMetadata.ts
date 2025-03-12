import { useState, useEffect } from 'react';
import { Repository } from '@/types/repository';

export function useMetadata<T>(repository: Repository, metadataType: string, fileName: string | undefined) {
  const [metadata, setMetadata] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetadata() {
      if (!fileName) {
        setError(`No ${metadataType} metadata file found`);
        return;
      }

      try {
        const response = await fetch(
          `/api/repositories/${repository.account_id}/${repository.repository_id}/files/${fileName}`
        );
        const data = await response.json();
        setMetadata(data);
      } catch (e) {
        setError(`Failed to load ${metadataType} metadata`);
      }
    }

    loadMetadata();
  }, [repository, fileName, metadataType]);

  return { metadata, error };
} 