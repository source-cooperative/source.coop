import type { StorageConfig } from '@/types/storage';
import { awsCredentialsProvider } from "@vercel/functions/oidc";

export const CONFIG = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'LOCAL',
    endpoint: process.env.STORAGE_ENDPOINT || './test-storage',
    region: process.env.AWS_REGION || 'us-east-1',
  } as StorageConfig,
  database: {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    region: process.env.AWS_REGION || 'us-east-1',
    roleArn: process.env.AWS_ROLE_ARN || '',
    credentials: process.env.AWS_ROLE_ARN
      ? awsCredentialsProvider({
          roleArn: process.env.AWS_ROLE_ARN,
        })
      : undefined,
  },
  auth: {
    // Admin configuration
    api: {
      frontendUrl: process.env.NEXT_PUBLIC_ORY_BASE_URL || '',
      backendUrl: process.env.ORY_BASE_URL || '',
    },
    accessToken: process.env.ORY_PROJECT_API_KEY || '',
    projectId: process.env.ORY_PROJECT_ID || '',
    projectSlug: process.env.ORY_PROJECT_SLUG || '',
    workspaceId: process.env.ORY_WORKSPACE_ID || '',
  },
  google: {
    siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  environment: {
    isDevelopment: process.env.NODE_ENV === 'development',
  },
} as const;

// Add debug logging
console.log('Loaded CONFIG:', {
  ...CONFIG,
  auth: {
    ...CONFIG.auth,
    accessToken: CONFIG.auth.accessToken ? '[REDACTED]' : undefined,
  },
});
