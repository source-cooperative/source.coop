import { Configuration, FrontendApi, Session, Identity } from "@ory/client";
import { edgeConfig } from "@ory/integrations/next";
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

// Create a new Ory SDK instance for client-side use
// export const ory = new FrontendApi(
//   new Configuration({
//     basePath: CONFIG.auth.api.frontendUrl,
//     baseOptions: {
//       withCredentials: true,
//       headers: {
//         Accept: "application/json",
//         "Content-Type": "application/json",
//       },
//       validateStatus: () => {
//         // Accept any status code to handle redirects
//         return true;
//       },
//     },
//   })
// );

const baseUrl: string = true
  ? CONFIG.auth.api.frontendUrl
  : "http://localhost:3000/api/.ory";

export const ory = CONFIG.auth.api.backendUrl
  ? new FrontendApi(
      new Configuration({
        // basePath: "http://localhost:3000/api/.ory",
        accessToken: process.env.ORY_ACCESS_TOKEN,
        baseOptions: {
          withCredentials: true, // Important for CORS
          timeout: 30000, // 30 seconds
        },
        basePath: "/api/.ory",
      })
    )
  : new FrontendApi(new Configuration(edgeConfig));

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

// Helper to get session data using the SDK
export async function getSession(): Promise<ExtendedSession | null> {
  try {
    const { data } = await ory.toSession();
    return data as ExtendedSession;
  } catch (error: any) {
    // Only log connection errors, not auth errors
    if (error.code === "ECONNREFUSED") {
      console.error("Connection refused - Ory tunnel is not running");
    } else if (!(error instanceof Error && error.message.includes("401"))) {
      console.error("Error getting session:", error);
    }
    return null;
  }
}

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
