import { NextRequest, NextResponse } from 'next/server';
import { ory } from '@/lib/ory';
import { fetchAccount } from '@/lib/db';
import { getDynamoDb } from '@/lib/clients';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { Session, Identity } from '@ory/client';
import type { Account } from '@/types/account';
import type { SessionWithMetadata } from '@/types/session';

interface SessionMetadata {
  account_id?: string;
  is_admin?: boolean;
}

interface SessionWithMetadata extends Session {
  identity?: Identity & {
    metadata_public?: SessionMetadata;
  };
}

export async function GET(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    // Get all cookies from the request
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session with Ory by making a direct request with all cookies
    const response = await fetch(`${process.env.NEXT_PUBLIC_ORY_SDK_URL}/sessions/whoami`, {
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Session verification failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await response.json() as SessionWithMetadata;
    
    if (!session?.active) {
      console.error('Session is not active');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if the user is authorized to access this account
    const sessionAccountId = session.identity?.metadata_public?.account_id;
    
    if (sessionAccountId !== params.account_id && !session.identity?.metadata_public?.is_admin) {
      console.error('User not authorized to access account:', {
        sessionAccountId,
        requestedAccountId: params.account_id,
        isAdmin: session.identity?.metadata_public?.is_admin
      });
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Fetch account from DynamoDB
    const account = await fetchAccount(params.account_id);
    
    if (!account) {
      console.error('Account not found:', params.account_id);
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

export async function PUT(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    // Get all cookies from the request
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session with Ory
    const response = await fetch(`${process.env.NEXT_PUBLIC_ORY_SDK_URL}/sessions/whoami`, {
      headers: {
        Cookie: cookieHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await response.json() as SessionWithMetadata;
    
    if (!session?.active) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if the user is authorized to update this account
    const sessionAccountId = session.identity?.metadata_public?.account_id;
    
    if (sessionAccountId !== params.account_id && !session.identity?.metadata_public?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const account: Account = await request.json();
    
    // TODO: Replace with actual database update
    const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/${params.account_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });

    if (!updateResponse.ok) {
      return NextResponse.json({ error: 'Failed to update account' }, { status: 400 });
    }

    const updatedAccount = await updateResponse.json();
    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;

    // Get the session cookie from the request
    const sessionCookie = request.cookies.get('ory_kratos_session');
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session with Ory
    const { data: session } = await ory.toSession() as { data: SessionWithMetadata };
    if (!session?.active) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data from session
    if (!session?.identity) {
      return NextResponse.json(
        { error: 'No identity found in session' },
        { status: 400 }
      );
    }

    // Verify the user is authorized (either deleting their own account or is an admin)
    const sessionAccountId = session.identity.metadata_public?.account_id;
    const isAdmin = session.identity.metadata_public?.is_admin === true;
    
    if (!sessionAccountId || (!isAdmin && sessionAccountId !== account_id)) {
      return NextResponse.json(
        { error: 'You can only delete your own account' },
        { status: 403 }
      );
    }

    // Verify CSRF token if not an API request
    const csrfToken = request.headers.get('x-csrf-token');
    if (!request.headers.get('authorization') && !csrfToken) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      );
    }

    // Fetch the account first to verify it exists and get its type
    const account = await fetchAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Delete the account from DynamoDB
    const dynamoDb = getDynamoDb();
    await dynamoDb.send(new DeleteCommand({
      TableName: "Accounts",
      Key: { 
        account_id,
        type: account.type
      }
    }));

    // Log out the user if they're deleting their own account
    if (sessionAccountId === account_id) {
      await ory.createBrowserLogoutFlow();
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully',
      deleted_by: isAdmin ? 'admin' : 'self'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 