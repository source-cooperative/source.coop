import type { StorageConfig } from '@/types/storage';

export const CONFIG = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'LOCAL',
    endpoint: process.env.STORAGE_ENDPOINT || './test-storage',
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  } as StorageConfig,
  database: {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY || 'local',
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
  storage: {
    ...CONFIG.storage,
    accessKeyId: CONFIG.storage.credentials?.access_key_id ? '[REDACTED]' : undefined,
    secretAccessKey: CONFIG.storage.credentials?.secret_access_key ? '[REDACTED]' : undefined,
  },
});
