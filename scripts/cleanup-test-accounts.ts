import { getServerSession } from "@ory/nextjs/app";

async function cleanupTestAccounts() {
  // Get your session
  const session = await getServerSession();
  if (!session) {
    console.error('No valid session found');
    return;
  }

  // Get list of test accounts
  const response = await fetch('/api/accounts', {
    headers: {
      // 'x-csrf-token': session.csrf_token
    },
    credentials: 'include'
  });

  const accounts = await response.json();

  // Delete test accounts
  for (const account of accounts) {
    if (account.email.includes('test-') || account.email.includes('@example.com')) {
      console.log(`Deleting test account: ${account.account_id}`);
      
      await fetch(`/api/accounts/${account.account_id}`, {
        method: 'DELETE',
        headers: {
          // 'x-csrf-token': session.csrf_token
        },
        credentials: 'include'
      });
    }
  }
}

cleanupTestAccounts().catch(console.error);
