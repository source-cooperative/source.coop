import { NextRequest, NextResponse } from 'next/server';
import { ory } from '@/lib/ory';

export async function GET(_request: NextRequest) {
  try {
    const { data: session } = await ory.toSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true,
      session 
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'No session found' },
      { status: 401 }
    );
  }
} 