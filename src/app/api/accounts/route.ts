import { NextResponse } from 'next/server';
import { ory } from '@/lib/ory';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Verify the user is authenticated
    const session = await ory.toSession();
    if (!session.data.active) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data from session
    if (!session.data.identity) {
      return NextResponse.json(
        { error: 'No identity found in session' },
        { status: 400 }
      );
    }

    const userId = session.data.identity.id;
    const email = session.data.identity.traits.email;

    // Create the account in our database
    const accountData = {
      ...data,
      email,
      ory_id: userId,
      type: 'individual' as const,
    };

    const response = await fetch(`${CONFIG.auth.apiUrl}/api/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to create account' },
        { status: response.status }
      );
    }

    const account = await response.json();
    return NextResponse.json(account);
  } catch (error) {
    console.error('Account creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
} 