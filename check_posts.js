require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const r = await supabase.from('posts').select('*').limit(1);
  if (r.error) console.log('posts error:', r.error.message);
  else console.log('posts columns:', Object.keys(r.data[0]));
}
check();
