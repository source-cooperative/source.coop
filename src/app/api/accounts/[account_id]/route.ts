import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchAccount } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  const accountId = params.account_id;
  
  try {
    // Verify session
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if the user is authorized to access this account
    const sessionAccountId = session.identity?.metadata_public?.account_id;
    
    if (sessionAccountId !== accountId && !session.identity?.metadata_public?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Fetch account from DynamoDB
    const account = await fetchAccount(accountId);
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 