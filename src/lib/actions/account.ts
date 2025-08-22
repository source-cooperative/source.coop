'use server';

import { updateOryIdentity } from '@/lib/ory';
import { LOGGER } from "@/lib/logging";

/**
 * Server action to record email verification timestamp
 */
export async function recordVerificationTimestamp(identityId: string) {
  try {
    if (!identityId) {
      throw new Error("Missing identity_id parameter");
    }

    LOGGER.info("Recording verification timestamp for identity", {
      operation: "recordVerificationTimestamp",
      context: "email verification",
      metadata: { identityId },
    });

    // Update the identity metadata with the verification timestamp
    const now = new Date().toISOString();
    await updateOryIdentity(identityId, {
      metadata_public: {
        email_verified_at: now,
      },
    });

    LOGGER.info("Successfully recorded verification timestamp", {
      operation: "recordVerificationTimestamp",
      context: "email verification",
      metadata: { identityId },
    });

    return {
      success: true,
      timestamp: now,
    };
  } catch (error) {
    LOGGER.error("Error recording verification timestamp", {
      operation: "recordVerificationTimestamp",
      context: "email verification",
      error: error,
    });
    throw new Error("Failed to record verification timestamp");
  }
} 
