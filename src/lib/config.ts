import type { OryConfig } from "@ory/nextjs";
import type { StorageConfig } from "@/types/storage";

export const CONFIG = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  },
  storage: {
    type: process.env.STORAGE_TYPE || "LOCAL",
    endpoint: process.env.STORAGE_ENDPOINT || "./test-storage",
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      access_key_id: process.env.AWS_ACCESS_KEY_ID || "",
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  } as StorageConfig,
  database: {
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY || "local",
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
  database: {
    ...CONFIG.database,
    accessKeyId: CONFIG.database.accessKeyId ? "[REDACTED]" : undefined,
    secretAccessKey: CONFIG.database.secretAccessKey ? "[REDACTED]" : undefined,
  },
  auth: {
    ...CONFIG.auth,
    accessToken: CONFIG.auth.accessToken ? "[REDACTED]" : undefined,
  },
  storage: {
    ...CONFIG.storage,
    credentials: {
      access_key_id: CONFIG.storage.credentials?.access_key_id
        ? "[REDACTED]"
        : undefined,
      secret_access_key: CONFIG.storage.credentials?.secret_access_key
        ? "[REDACTED]"
        : undefined,
    },
  },
});
