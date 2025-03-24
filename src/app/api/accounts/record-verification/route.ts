import { NextResponse } from 'next/server';
import { updateOryIdentity } from '@/lib/ory';

/**
 * API endpoint to record email verification timestamp in Ory metadata
 * POST /api/accounts/record-verification
 */
export async function POST(request: Request) {
  try {
    const { identity_id } = await request.json();
    
    if (!identity_id) {
      return NextResponse.json(
        { error: 'Missing identity_id parameter' },
        { status: 400 }
      );
    }
    
    console.log('Recording verification timestamp for identity:', identity_id);
    
    // Update the identity metadata with the verification timestamp
    const now = new Date().toISOString();
    await updateOryIdentity(identity_id, {
      metadata_public: {
        email_verified_at: now
      }
    });
    
    console.log('Successfully recorded verification timestamp');
    
    return NextResponse.json({
      success: true,
      timestamp: now
    });
  } catch (error) {
    console.error('Error recording verification timestamp:', error);
    return NextResponse.json(
      { error: 'Failed to record verification timestamp' },
      { status: 500 }
    );
  }
} 