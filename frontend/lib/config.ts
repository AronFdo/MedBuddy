// Configuration for different environments
const config = {
  development: {
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL_DEV || 'http://172.20.10.3:3001',
  },
  staging: {
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL_STAGING || 'https://your-staging-backend-url.railway.app',
  },
  production: {
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL_PROD || 'https://your-production-backend-url.railway.app',
  },
};

// Get current environment
const getEnvironment = () => {
  if (__DEV__) {
    return 'development';
  }
  // You can add logic here to detect staging vs production
  return 'production';
};

// Export the current configuration
export const currentConfig = config[getEnvironment()];

// Export individual values for convenience
export const BACKEND_URL = currentConfig.backendUrl;
