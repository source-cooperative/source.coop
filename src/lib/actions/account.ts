'use server';

import { updateOryIdentity } from '@/lib/ory';

/**
 * Server action to record email verification timestamp
 */
export async function recordVerificationTimestamp(identityId: string) {
  try {
    if (!identityId) {
      throw new Error('Missing identity_id parameter');
    }
    
    console.log('Recording verification timestamp for identity:', identityId);
    
    // Update the identity metadata with the verification timestamp
    const now = new Date().toISOString();
    await updateOryIdentity(identityId, {
      metadata_public: {
        email_verified_at: now
      }
    });
    
    console.log('Successfully recorded verification timestamp');
    
    return {
      success: true,
      timestamp: now
    };
  } catch (error) {
    console.error('Error recording verification timestamp:', error);
    throw new Error('Failed to record verification timestamp');
  }
} 