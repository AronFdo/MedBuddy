// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qepwahqrjcfbxuiurgjc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHdhaHFyamNmYnh1aXVyZ2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NDg3MTcsImV4cCI6MjA2NjMyNDcxN30.Z6bEijCZitLln34rdT8iVv_yPGFxp5TpwyhiUW8fak4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
  }
}

testConnection();











