const fs = require('fs');
const { Client } = require('pg');

// Read .env.local
const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

// Extract project ref from URL: https://rdpkmpgyvxjfmivowfrc.supabase.co -> rdpkmpgyvxjfmivowfrc
const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const ref = refMatch ? refMatch[1] : '';

console.log('Project Ref:', ref);

// If DIRECT_DB_URL is available, use it, else construct pooler connection string
const dbUrl = env.DATABASE_URL || `postgresql://postgres.${ref}:your-db-password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

console.log('DB Connection String:', dbUrl);
