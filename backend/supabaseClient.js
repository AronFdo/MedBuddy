const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Ensure envs are loaded in local dev even if this file is imported before index.js
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
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

  cachedClient = createClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

module.exports = { getSupabase };


