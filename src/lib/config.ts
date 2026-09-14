import type { StorageConfig } from "@/types/storage";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

const region = process.env.AWS_REGION || "us-east-1";

// In dev, we use middleware to serve auth pages.
// In production, we use auth.source.coop to serve auth pages.
const frontendUrl = process.env.NEXT_PUBLIC_ORY_UI_URL || "";

export const CONFIG = {
  // Object storage configuration
  storage: {
    type: "S3",
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
    region: "us-east-1",
  } as StorageConfig,

  // Assets (profile images, etc.) configuration
  assets: {
    bucket: process.env.ASSETS_BUCKET,
    domain: process.env.ASSETS_DOMAIN,
    region: region,
  },

  // DynamoDB configuration
  database: {
    endpoint:
      process.env.DYNAMODB_ENDPOINT ||
      `https://dynamodb.${region}.amazonaws.com`,
    region,
    credentials: process.env.AWS_ROLE_ARN
      ? awsCredentialsProvider({
          roleArn: process.env.AWS_ROLE_ARN,
        })
      : undefined,
  },

  // Encryption key (base64, decoding to 32 bytes) for the per-user
  // proxy-credentials cookie (`sc_proxy_creds`).
  proxyCredentialsCookieKey: process.env.PROXY_CREDS_COOKIE_KEY || "",

  // Ory.sh configuration
  auth: {
    api: {
      backendUrl: process.env.NEXT_PUBLIC_ORY_SDK_URL,
      frontendUrl,
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || "",

    oauth2: {
      clientId: process.env.ORY_OAUTH2_CLIENT_ID || "",
      clientSecret: process.env.ORY_OAUTH2_CLIENT_SECRET || "",
      // Virtual redirect_uri for the headless OAuth2 flow. Hydra validates it
      // against the client's registered URIs and the token exchange echoes it,
      // but the flow is fully server-side (see getOryIdToken) — this URL is never
      // navigated and no route serves it. Must stay byte-identical to the URI
      // registered on every Ory OAuth2 client we use.
      redirectUri: "https://source.coop",
    },

    routes: {
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLoginFlow
      login: `${frontendUrl}/self-service/login/browser`,
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLogoutFlow
      logout: `${frontendUrl}/self-service/logout/browser`,
    },
  },

  // Cloudflare Analytics Engine — request analytics written by the data proxy.
  // All three must be set for analytics UI to appear; otherwise it hides itself.
  analytics: {
    accountId: process.env.CF_ANALYTICS_ACCOUNT_ID || "",
    apiToken: process.env.CF_ANALYTICS_API_TOKEN || "",
    dataset: process.env.CF_ANALYTICS_DATASET || "",
  },

  // Location WebSocket for live globe
  locationWs: {
    url: process.env.NEXT_PUBLIC_LOCATION_WS_URL,
  },

  // Google configuration
  google: {
    siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },

  // Environment configuration
  environment: {
    // Local development only — Vercel preview and production both set
    // NODE_ENV=production. Use isProduction to distinguish prod from staging.
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: (process.env.STAGE || "dev") === "prod",
    isTest: process.env.NODE_ENV === "test",
    stage: process.env.STAGE || "dev",
  },
} as const;
