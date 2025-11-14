const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Ensure envs are loaded in local dev even if this file is imported before index.js
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  const candidates = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, 'api', '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.env.local')
  ];
  for (const candidate of candidates) {
    try {
      dotenv.config({ path: candidate, override: false });
    } catch (_) {}
  }
}

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  if (!supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variable');
  }

  // Only log in development for security
  if (process.env.NODE_ENV !== 'production') {
    console.log('✓ Supabase client initialized');
    console.log(`  URL: ${supabaseUrl}`);
    console.log(`  Using: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'}`);
  }

  cachedClient = createClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

module.exports = { getSupabase };


