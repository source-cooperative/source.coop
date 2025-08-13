import type { OryConfig } from "@ory/nextjs";
import type { StorageConfig } from "@/types/storage";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

// When running locally, we use the NEXT_PUBLIC_LOCAL_ORY_SDK_URL environment variable to
// instruct the middleware to proxy requests to Ory.
// In production, we use the NEXT_PUBLIC_ORY_SDK_URL environment variable to send requests
// directly to Ory.
const ORY_SDK_URL =
  process.env.NEXT_PUBLIC_LOCAL_ORY_SDK_URL !== undefined
    ? process.env.NEXT_PUBLIC_LOCAL_ORY_SDK_URL
    : process.env.NEXT_PUBLIC_ORY_SDK_URL;

export const CONFIG = {
  storage: {
    type: process.env.STORAGE_TYPE || "S3",
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: "anonymous",
      secretAccessKey: "anonymous",
    },
  } as StorageConfig,
  database: {
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    region: process.env.AWS_REGION || "us-east-1",
    credentials: process.env.AWS_ROLE_ARN
      ? awsCredentialsProvider({
          roleArn: process.env.AWS_ROLE_ARN,
        })
      : undefined,
  },
  auth: {
    api: {
      frontendUrl: ORY_SDK_URL,
      backendUrl: process.env.NEXT_PUBLIC_ORY_SDK_URL,
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || "",

    routes: {
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLoginFlow
      login: `${ORY_SDK_URL}/self-service/login/browser`,
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLogoutFlow
      logout: `${ORY_SDK_URL}/self-service/logout/browser`,
    },

    // Override configuration
    config: {
      // override: {
      //   applicationName: "",
      //   loginUiPath: "/auth/login",
      //   registrationUiPath: "/auth/registration",
      //   recoveryUiPath: "/auth/recovery",
      //   verificationUiPath: "/auth/verification",
      //   settingsUiPath: "/auth/settings",
      //   defaultRedirectUri: "/",
      // },
    } as OryConfig,
  },
  google: {
    siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  environment: {
    isDevelopment: process.env.NODE_ENV === "development",
    stage: process.env.STAGE || "dev",
  },
} as const;

// Add debug logging
console.log("Loaded CONFIG:", {
  ...CONFIG,
  auth: {
    ...CONFIG.auth,
    accessToken: CONFIG.auth.accessToken ? "[REDACTED]" : undefined,
  },
});
