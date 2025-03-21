import { Configuration, FrontendApi, Session, Identity } from '@ory/client';

// Extend Identity to include our metadata
declare module '@ory/client' {
  interface Identity {
    metadata_public?: {
      account_id?: string;
      is_admin?: boolean;
    };
  }
}

// Initialize the Ory client with the correct basePath
export const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
    baseOptions: {
      withCredentials: true,
    }
  })
);

// Initialize the Ory client with the correct basePath
export const oryBrowserClient = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
    baseOptions: {
      withCredentials: true,
    }
  })
);

// Helper to get session data using the SDK
export async function getSession(): Promise<Session | null> {
  try {
    const { data: session } = await ory.toSession();
    return session as Session;
  } catch (error) {
    return null;
  }
}

// Helper to get account_id from session
export async function getAccountId(): Promise<string | null> {
  const session = await getSession();
  return session?.identity?.metadata_public?.account_id || null;
} 