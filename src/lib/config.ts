// Helper to ensure we don't get undefined values
const getEnvVar = (key: string, defaultValue: string): string => {
  const value = process.env[key];
  console.log(`Reading env var ${key}:`, { value, defaultValue });
  if (!value) {
    console.warn(`Environment variable ${key} not found, using default: ${defaultValue}`);
    return defaultValue;
  }
  return value;
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
} as const;

// Add debug logging
console.log('Loaded CONFIG:', CONFIG); 