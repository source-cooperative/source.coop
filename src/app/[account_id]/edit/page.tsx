import { notFound } from 'next/navigation';
import { fetchAccount } from '@/lib/db';
import { EditProfileForm } from './EditProfileForm';

export default async function EditProfilePage({ 
  params 
}: { 
  params: { account_id: string } 
}) {
  const account = await fetchAccount(params.account_id);
  
  if (!account) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <EditProfileForm account={account} />
    </div>
  );
} 