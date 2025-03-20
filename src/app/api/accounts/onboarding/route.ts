import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { IndividualAccount } from '@/types/account';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "https://playground.projects.oryapis.com";

export async function POST(request: NextRequest) {
  try {
    // Get the current session to get Ory ID
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    const sessionResponse = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    });
    
    if (!sessionResponse.ok) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const session = await sessionResponse.json();
    const oryId = session.identity.id;
    
    if (!oryId) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }
    
    // Get the submitted account data
    const body = await request.json();
    const { account_id, name } = body;
    
    // Validate the input
    if (!account_id || account_id.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }
    
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Check username availability
    // In a real implementation, this would check against your database
    const checkResponse = await fetch(`${request.nextUrl.origin}/api/accounts/check-username?username=${encodeURIComponent(account_id)}`);
    const checkData = await checkResponse.json();
    
    if (!checkData.available) {
      return NextResponse.json(
        { error: 'Username is not available' },
        { status: 400 }
      );
    }
    
    // Create the account in your database
    const newAccount: IndividualAccount = {
      account_id,
      name,
      type: 'individual',
      ory_id: oryId,
      email: session.identity.traits.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // In a real implementation, you would save this to your database
    console.log('Creating new account:', newAccount);
    
    // Now update Ory identity to include account_id in the metadata
    const updateResponse = await fetch(`${ORY_BASE_URL}/admin/identities/${oryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // In production, you'd need proper authorization for admin APIs
        'Authorization': `Bearer ${process.env.ORY_ADMIN_API_KEY || 'test'}`,
      },
      body: JSON.stringify({
        schema_id: 'default',
        traits: session.identity.traits,
        metadata_public: {
          ...session.identity.metadata_public,
          account_id,
        },
      }),
    });
    
    if (!updateResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      account_id, 
      message: 'Onboarding completed successfully' 
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 