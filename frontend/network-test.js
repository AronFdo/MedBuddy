// Test network connectivity to Supabase
const https = require('https');

const supabaseUrl = 'https://qepwahqrjcfbxuiurgjc.supabase.co';

console.log('Testing network connectivity to Supabase...');
console.log('URL:', supabaseUrl);

const req = https.get(supabaseUrl, (res) => {
  console.log('✅ Successfully connected to Supabase!');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});

req.on('error', (err) => {
  console.error('❌ Network error:', err.message);
  console.error('This could be due to:');
  console.error('- Firewall blocking the connection');
  console.error('- Network restrictions');
  console.error('- DNS issues');
});

req.setTimeout(10000, () => {
  console.error('❌ Connection timeout');
  req.destroy();
});











