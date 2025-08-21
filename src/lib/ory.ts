import { ExtendedSession } from "@/types";
import { Session } from "@ory/client-fetch";
import { logger } from "@/lib/logger";
import { CONFIG } from "./config";

// Helper to update Ory identity (admin operation)
export async function updateOryIdentity(oryId: string, data: any) {
  if (!CONFIG.auth.api.backendUrl) {
    throw new Error("No Ory private base URL configured");
  }

  if (!CONFIG.auth.accessToken) {
    throw new Error("No Ory access token configured");
  }

  // First, get the current identity to understand its structure
  const getResponse = await fetch(
    `${CONFIG.auth.api.backendUrl}/admin/identities/${oryId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CONFIG.auth.accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    console.error("Failed to get Ory identity:", {
      status: getResponse.status,
      statusText: getResponse.statusText,
      error: errorText,
      url: getResponse.url,
      baseUrl: CONFIG.auth.api.backendUrl,
      hasAccessToken: !!CONFIG.auth.accessToken,
    });
    throw new Error(errorText);
  }

  // Get the current identity structure
  const currentIdentity = await getResponse.json();

  // Create a new update object with ONLY the fields that Ory expects
  const updateData = {
    schema_id: currentIdentity.schema_id,
    state: currentIdentity.state,
    traits: currentIdentity.traits,
    metadata_public: {
      ...currentIdentity.metadata_public,
      ...data.metadata_public,
    },
    metadata_admin: currentIdentity.metadata_admin || {},
  };

  // Now update with the properly structured data
  const response = await fetch(
    `${CONFIG.auth.api.backendUrl}/admin/identities/${oryId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.auth.accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(updateData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to update Ory identity:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: response.url,
      baseUrl: CONFIG.auth.api.backendUrl,
      hasAccessToken: !!CONFIG.auth.accessToken,
    });
    throw new Error(errorText);
  }

  return response.json();
}

// Helper to get account_id from session
export function getAccountId(session: Session | null): string | null {
  return (
    (session as ExtendedSession)?.identity?.metadata_public?.account_id || null
  );
}

/**
 * Get the Ory ID from an Ory session
 * @param session - The Ory session object
 * @returns The Ory ID or null if not found
 */
export function getOryId(session: Session): string | null {
  const oryId = session.identity?.id;
  if (!oryId) {
    logger.warn("No identity ID found in session", {
      operation: "getApiSession",
      context: "session",
    });
    return null;
  }
  return oryId;
}
