export const CONFIG = {
  storage: {
    type: process.env.STORAGE_TYPE as 'LOCAL' | 'S3',
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.AWS_REGION,
  },
  database: {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    },
  },
} as const; 