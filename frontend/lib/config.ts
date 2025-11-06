// Configuration for different environments
// FORCE PRODUCTION URL - Always use Cloud Run backend (ignoring environment variables)

// Cloud Run Production Backend URL
const PRODUCTION_BACKEND_URL = 'https://medbuddy-backend-200167278829.asia-south1.run.app';

// Export the backend URL - ALWAYS use Cloud Run URL, ignore all environment variables
// This ensures we never accidentally use Railway or local URLs
export const BACKEND_URL = PRODUCTION_BACKEND_URL;

// Log for debugging (only in development)
if (__DEV__) {
  console.log('🔧 Backend URL Configuration:');
  console.log('  FORCED to use Cloud Run URL');
  console.log('  BACKEND_URL:', BACKEND_URL);
  console.log('  Environment variables are IGNORED to prevent Railway URL conflicts');
}
