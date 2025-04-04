import type { StorageConfig } from '@/types/storage';

// Helper to ensure we don't get undefined values
const getEnvVar = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

export const CONFIG = {
  storage: {
    type: getEnvVar('STORAGE_TYPE', 'LOCAL'),
    endpoint: getEnvVar('STORAGE_ENDPOINT', './test-storage'),
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    credentials: {
      access_key_id: getEnvVar('AWS_ACCESS_KEY_ID', ''),
      secret_access_key: getEnvVar('AWS_SECRET_ACCESS_KEY', ''),
    },
  } as StorageConfig,
  database: {
    endpoint: getEnvVar('DYNAMODB_ENDPOINT', 'http://localhost:8000'),
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    accessKeyId: getEnvVar('DYNAMODB_ACCESS_KEY_ID', 'local'),
    secretAccessKey: getEnvVar('DYNAMODB_SECRET_ACCESS_KEY', 'local'),
  },
  auth: {
    // Public URLs for client-side
    publicBaseUrl: getEnvVar('NEXT_PUBLIC_ORY_BASE_URL', 'http://localhost:4000'),
    // Private URLs for server-side
    privateBaseUrl: getEnvVar('ORY_BASE_URL', 'http://localhost:4000'),
    // Admin configuration
    projectId: getEnvVar('ORY_PROJECT_ID', ''),
    projectSlug: getEnvVar('ORY_PROJECT_SLUG', ''),
    apiUrl: getEnvVar('ORY_API_URL', ''),
    workspaceId: getEnvVar('ORY_WORKSPACE_ID', ''),
    accessToken: getEnvVar('ORY_PROJECT_API_KEY', ''),
    // API configuration
    apiBaseUrl: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3000'),
  },
  google: {
    siteVerification: getEnvVar('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', ''),
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
