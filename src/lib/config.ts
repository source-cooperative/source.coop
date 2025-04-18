import type { OryConfig } from "@ory/nextjs";
import type { StorageConfig } from '@/types/storage';
import { awsCredentialsProvider } from "@vercel/functions/oidc";

export const CONFIG = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'S3',
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: "anonymous",
      secretAccessKey: "anonymous",
    },
  } as StorageConfig,
  database: {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ROLE_ARN
      ? awsCredentialsProvider({
          roleArn: process.env.AWS_ROLE_ARN,
        })
      : undefined,
  },
  auth: {
    // Admin configuration

    // Remove this
    api: {
      frontendUrl: process.env.NEXT_PUBLIC_ORY_SDK_URL || "",
      backendUrl: process.env.ORY_BASE_URL || "",
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || "",
    // /end Remove

    // Override configuration
    config: {
      override: {
        applicationName: "",
        loginUiPath: "/auth/login",
        registrationUiPath: "/auth/registration",
        recoveryUiPath: "/auth/recovery",
        verificationUiPath: "/auth/verification",
        settingsUiPath: "/auth/settings",
        defaultRedirectUri: "/",
      },
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
