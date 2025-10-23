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
    credentials: {
      accessKeyId: "anonymous",
      secretAccessKey: "anonymous",
    },
    // Optional role to use when granting temporary upload credentials
    uploadAccessRoleArn: process.env.AWS_UPLOAD_ACCESS_ROLE_ARN || "",
  } as StorageConfig,

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

  // API Secret for the Data Proxy to access the API
  apiSecret: process.env.SOURCE_KEY || "",

  // Ory.sh configuration
  auth: {
    api: {
      backendUrl: process.env.NEXT_PUBLIC_ORY_SDK_URL,
      frontendUrl,
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || "",

    routes: {
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLoginFlow
      login: `${frontendUrl}/self-service/login/browser`,
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLogoutFlow
      logout: `${frontendUrl}/self-service/logout/browser`,
    },
  },

  // Google configuration
  google: {
    siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },

  // Environment configuration
  environment: {
    isDevelopment: process.env.NODE_ENV === "development",
    stage: process.env.STAGE || "dev",
  },
} as const;
