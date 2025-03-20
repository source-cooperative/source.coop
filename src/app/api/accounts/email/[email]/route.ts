import { NextResponse } from 'next/server';
import { CONFIG } from '@/lib/config';

export async function GET(
  request: Request,
  { params }: { params: { email: string } }
) {
  try {
    const email = decodeURIComponent(params.email);
    
    // Call our database API to look up the account by email
    const response = await fetch(`${CONFIG.auth.apiUrl}/api/accounts/email/${email}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const account = await response.json();
    return NextResponse.json(account);
  } catch (error) {
    console.error('Error looking up account by email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 