// Helper to ensure we don't get undefined values
const getEnvVar = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

export const CONFIG = {
  storage: {
    type: getEnvVar('STORAGE_TYPE', 'LOCAL'),
    endpoint: getEnvVar('STORAGE_ENDPOINT', './test-storage'),
    region: getEnvVar('AWS_REGION', 'us-east-1'),
  },
  database: {
    endpoint: getEnvVar('DYNAMODB_ENDPOINT', 'http://localhost:8000'),
    region: getEnvVar('AWS_REGION', 'us-east-1'),
  },
  auth: {
    kratosUrl: getEnvVar('NEXT_PUBLIC_KRATOS_URL', 'http://localhost:4000'),
    orySdkUrl: getEnvVar('NEXT_PUBLIC_ORY_SDK_URL', 'http://localhost:4000'),
    apiUrl: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3000'),
  },
} as const;

// Add debug logging
console.log('Loaded CONFIG:', CONFIG); 