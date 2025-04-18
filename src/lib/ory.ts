import { Configuration, FrontendApi, Session, Identity } from "@ory/client";
import { CONFIG } from "./config";

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

// Create a server-side instance of the Ory SDK
export const serverOry = new FrontendApi(
  new Configuration({
    basePath: CONFIG.auth.api.backendUrl,
    baseOptions: {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: () => {
        // Accept any status code to handle redirects
        return true;
      },
    },
  })
);

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
