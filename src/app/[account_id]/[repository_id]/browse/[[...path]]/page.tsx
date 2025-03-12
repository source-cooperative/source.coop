import { ObjectBrowser } from '@/components/ObjectBrowser';
import { notFound } from 'next/navigation';
import { fetchObjects } from '@/lib/api';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path?: string[];
  };
}

export default async function BrowsePage({ params }: PageProps) {
  try {
    const objects = await fetchObjects(params.account_id, params.repository_id);
    
    return (
      <ObjectBrowser 
        account_id={params.account_id}
        repository_id={params.repository_id}
        objects={objects}
        initialPath={params.path?.join('/') || ''}
      />
    );
  } catch (error) {
    return notFound();
  }
} 