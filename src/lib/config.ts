import type { StorageConfig } from "@/types/storage";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

const region = process.env.AWS_REGION || "us-east-1";

const frontendUrl = process.env.NEXT_PUBLIC_ORY_UI_URL || "";

export const CONFIG = {
  storage: {
    type: "S3",
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: "anonymous",
      secretAccessKey: "anonymous",
    },
  } as StorageConfig,
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
  auth: {
    api: {
      backendUrl: process.env.NEXT_PUBLIC_ORY_SDK_URL,
      frontendUrl,
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || "",

    routes: {
      // We use middleware to serve auth pages.
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLoginFlow
      login: `${frontendUrl}/self-service/login/browser`,
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLogoutFlow
      logout: `${frontendUrl}/self-service/logout/browser`,
    },
  },
  google: {
    siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  environment: {
    isDevelopment: process.env.NODE_ENV === "development",
    stage: process.env.STAGE || "dev",
  },
} as const;
