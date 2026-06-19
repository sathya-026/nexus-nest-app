export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173/',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'nexus',
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_secret_change_me',
    privateSessionSecret: process.env.WIDGET_JWT_SECRET || 'change_me_too',
    privateSessionExpiry: '7d',
    sessionSecret: process.env.WIDGET_JWT_SECRET || 'change_me_too',
    sessionExpiresIn: '1h',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.S3_BUCKET_NAME || 'nexus-documents',
  },

  agentCore: {
    url: process.env.AGENT_CORE_URL || 'http://localhost:8000',
  },

  smtp: {
    resendApiKey: process.env.RESEND_API_KEY || '',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
});
