import { NextRequest, NextResponse } from 'next/server';
import { ory } from '@/lib/ory';
import { fetchAccount, updateAccount } from '@/lib/db/operations';
import { getDynamoDb } from '@/lib/clients';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { ExtendedSession } from '@/lib/ory';

export async function GET(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    // Await params before using them
    const { account_id } = await Promise.resolve(params);
    
    // Fetch account from DynamoDB
    const account = await fetchAccount(account_id);
    
    if (!account) {
      console.error('Account not found:', account_id);
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Try to get authentication status, but don't require it
    let isAuthenticated = false;
    let isAuthenticatedUser = false;
    let isAdmin = false;
    
    try {
      // Get all cookies from the request
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // Use the cookie header for session verification
        const { data: session } = await ory.toSession({
          cookie: cookieHeader
        }) as { data: ExtendedSession };
        
        console.log('API: Session check:', {
          hasSession: !!session,
          isActive: session?.active,
          hasIdentity: !!session?.identity,
          sessionAccountId: session?.identity?.metadata_public?.account_id,
          requestedAccountId: account_id
        });
        
        if (session?.active && session.identity) {
          isAuthenticated = true;
          const sessionAccountId = session.identity?.metadata_public?.account_id;
          isAuthenticatedUser = sessionAccountId === account_id;
          isAdmin = !!session.identity?.metadata_public?.is_admin;
          
          console.log('API: Auth status:', {
            isAuthenticated,
            isAuthenticatedUser,
            isAdmin,
            sessionAccountId,
            requestedAccountId: account_id
          });
        }
      }
    } catch (authError) {
      // Log the actual error for debugging
      console.error('API: Auth error:', authError);
      console.log('User not authenticated, showing public account data only');
    }
    
    // Filter account data based on authentication status
    // If the user is viewing their own account or is an admin, include all fields
    if (isAuthenticatedUser || isAdmin) {
      console.log('API: Returning full account data:', account);
      return NextResponse.json(account);
    } 
    
    // For public views, only return public data
    const publicAccountData = {
      account_id: account.account_id,
      name: account.name,
      type: account.type,
      description: account.description,
      websites: account.websites,
      created_at: account.created_at,
      updated_at: account.updated_at
    };
    
    console.log('API: Returning public account data:', publicAccountData);
    return NextResponse.json(publicAccountData);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
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

    const session = await response.json() as ExtendedSession;
    
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

    const account = await request.json();
    
    // Verify the account_id matches the URL parameter
    if (account.account_id !== params.account_id) {
      return NextResponse.json(
        { error: 'Account ID mismatch' },
        { status: 400 }
      );
    }

    // Update the account in DynamoDB
    const success = await updateAccount(account);
    
    if (!success) {
      console.error('Failed to update account:', {
        account_id: params.account_id,
        account_type: account.type,
        account_data: account
      });
      return NextResponse.json(
        { error: 'Failed to update account in database' },
        { status: 400 }
      );
    }

    // Fetch and return the updated account
    const updatedAccount = await fetchAccount(params.account_id);
    if (!updatedAccount) {
      return NextResponse.json(
        { error: 'Account not found after update' },
        { status: 404 }
      );
    }

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
    const { data: session } = await ory.toSession() as { data: ExtendedSession };
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