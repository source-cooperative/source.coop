import { useState, useEffect } from 'react';
import { Repository } from '@/types';

export function useMetadata<T>(repository: Repository, metadataType: string, fileName: string | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetadata() {
      if (!fileName) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/repositories/${repository.account.account_id}/${repository.repository_id}/metadata/${metadataType}/${fileName}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('An error occurred'));
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [repository, metadataType, fileName]);

  return { data, error, loading };
} 