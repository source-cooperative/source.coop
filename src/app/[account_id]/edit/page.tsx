import { notFound } from 'next/navigation';
import { fetchAccount } from '@/lib/db';
import { EditProfileForm } from './EditProfileForm';

export default async function EditProfilePage({ 
  params 
}: { 
  params: Promise<{ account_id: string }> 
}) {
  const { account_id } = await params;
  const account = await fetchAccount(account_id);
  
  if (!account) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <EditProfileForm account={account} />
    </div>
  );
} 