import { fetchAccount } from '@/lib/db/operations';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get username from query parameters
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const account = await fetchAccount(username);
    return NextResponse.json({
      exists: account !== null,
      account: account
    });
  } catch (error) {
    console.error('Error checking account:', error);
    return NextResponse.json({ error: 'Failed to check account' }, { status: 500 });
  }
} 