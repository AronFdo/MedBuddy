// Configuration for different environments
const config = {
  development: {
    // Use Railway URL in development (override with EXPO_PUBLIC_BACKEND_URL_DEV if you need local backend)
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL_DEV || 'https://medbuddy-production.up.railway.app',
  },
  staging: {
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL_STAGING || 'https://medbuddy-production.up.railway.app',
  },
  production: {
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL_PROD || 'https://medbuddy-production.up.railway.app',
  },
};

// Get current environment
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  // Priority 1: Check explicit environment variable (most specific)
  if (process.env.EXPO_PUBLIC_ENV === 'production') {
    return 'production';
  }
  if (process.env.EXPO_PUBLIC_ENV === 'staging') {
    return 'staging';
  }
  if (process.env.EXPO_PUBLIC_ENV === 'development') {
    return 'development';
  }
  
  // Priority 2: Check if production backend URL is explicitly set (from eas.json build config)
  if (process.env.EXPO_PUBLIC_BACKEND_URL_PROD) {
    return 'production';
  }
  
  // Priority 3: Check if staging backend URL is explicitly set
  if (process.env.EXPO_PUBLIC_BACKEND_URL_STAGING) {
    return 'staging';
  }
  
  // Priority 4: Development mode - but still uses Railway URL by default
  // If running with expo start (development mode), use development config
  // which now defaults to Railway URL
  if (__DEV__) {
    return 'development';
  }
  
  // Default to production for production builds (app bundles, release builds)
  return 'production';
};

// Get the current environment
const currentEnvironment = getEnvironment();

// Export the current configuration
export const currentConfig = config[currentEnvironment];

// Export individual values for convenience
export const BACKEND_URL = currentConfig.backendUrl;

// Log configuration (helpful for debugging in all environments)
console.log('📡 Backend Configuration:');
console.log(`  Environment: ${currentEnvironment}`);
console.log(`  Backend URL: ${BACKEND_URL}`);
console.log(`  __DEV__: ${__DEV__}`);
console.log(`  EXPO_PUBLIC_BACKEND_URL_PROD: ${process.env.EXPO_PUBLIC_BACKEND_URL_PROD || 'not set'}`);
console.log(`  EXPO_PUBLIC_BACKEND_URL_STAGING: ${process.env.EXPO_PUBLIC_BACKEND_URL_STAGING || 'not set'}`);
console.log(`  EXPO_PUBLIC_BACKEND_URL_DEV: ${process.env.EXPO_PUBLIC_BACKEND_URL_DEV || 'not set'}`);
