import type { OryConfig } from "@ory/nextjs";
import type { StorageConfig } from "@/types/storage";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

const ORY_BASE_URL = process.env.VERCEL_ENV
  ? process.env.NEXT_PUBLIC_ORY_SDK_URL
  : "";

export const CONFIG = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  },
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
    // Remove this
    api: {
      frontendUrl: process.env.VERCEL_ENV
        ? process.env.NEXT_PUBLIC_ORY_SDK_URL
        : "",
      backendUrl: process.env.ORY_BASE_URL || "",
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || "",
    // /end Remove

    routes: {
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLoginFlow
      login: `${ORY_BASE_URL}/self-service/login/browser`,
      // https://www.ory.sh/docs/reference/api#tag/frontend/operation/createBrowserLogoutFlow
      logout: `${ORY_BASE_URL}/self-service/logout/browser`,
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
