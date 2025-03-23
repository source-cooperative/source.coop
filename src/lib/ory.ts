import { Configuration, FrontendApi, Session, Identity } from '@ory/client';
import { CONFIG } from './config';

// Define our metadata types
interface IdentityMetadataPublic {
  account_id?: string;
  is_admin?: boolean;
}

// Extend the Ory Identity type
type ExtendedIdentity = Identity & {
  metadata_public?: IdentityMetadataPublic | null;
};

// Extend the Ory Session type
export type ExtendedSession = Session & {
  identity?: ExtendedIdentity;
};

// Create a new Ory SDK instance
export const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
    baseOptions: {
      withCredentials: true,
      headers: {
        'Accept': 'application/json',
      },
    },
  })
);

// Helper to get session data using the SDK
export async function getSession(): Promise<ExtendedSession | null> {
  try {
    // Use the same basePath as the Ory client
    const basePath = process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000';
    // Directly call the whoami endpoint with fetch for more control
    const response = await fetch(`${basePath}/sessions/whoami`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // 401 is expected for non-logged in users, not an error
    if (response.status === 401) {
      return null;
    }
    
    if (!response.ok) {
      console.log(`Session check failed with status: ${response.status}`);
      return null;
    }
    
    const session = await response.json();
    if (!session?.active || !session?.identity) {
      return null;
    }
    
    return session as ExtendedSession;
  } catch (error) {
    // Only log connection errors, not auth errors
    if (error.code === 'ECONNREFUSED') {
      console.error("Connection refused - Ory tunnel is not running");
    } else if (!(error instanceof Response && error.status === 401)) {
      console.error('Error getting session:', error);
    }
    return null;
  }
}

// Helper to get account_id from session
export async function getAccountId(): Promise<string | null> {
  const session = await getSession() as ExtendedSession;
  return session?.identity?.metadata_public?.account_id || null;
}

// Helper to update Ory identity (admin operation)
export async function updateOryIdentity(oryId: string, data: any) {
  // First, get the current identity to understand its structure
  const getResponse = await fetch(
    `${process.env.ORY_API_URL}/admin/identities/${oryId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.ORY_ACCESS_TOKEN}`,
        Accept: 'application/json'
      }
    }
  );

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    console.error('Failed to get Ory identity:', {
      status: getResponse.status,
      statusText: getResponse.statusText,
      error: errorText,
      url: getResponse.url,
    });
    throw new Error(errorText);
  }

  // Get the current identity structure
  const currentIdentity = await getResponse.json();
  
  // Create a new update object with ONLY the fields that Ory expects
  // This explicitly EXCLUDES credentials/password information
  const updateData = {
    schema_id: currentIdentity.schema_id,
    state: currentIdentity.state,
    traits: currentIdentity.traits,
    metadata_public: {
      ...currentIdentity.metadata_public,
      account_id: data.metadata_public?.account_id
    },
    metadata_admin: currentIdentity.metadata_admin || {}
  };

  // Now update with the properly structured data
  const response = await fetch(
    `${process.env.ORY_API_URL}/admin/identities/${oryId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ORY_ACCESS_TOKEN}`,
        Accept: 'application/json'
      },
      body: JSON.stringify(updateData)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to update Ory identity:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: response.url,
    });
    throw new Error(errorText);
  }

  return response.json();
} 