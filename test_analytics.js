require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const tables = ['site_visits', 'comments', 'reactions', 'posthog_metrics'];
  
  for (const t of tables) {
    const r = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: error=${r.error?.message || 'none'}, count=${r.count}`);
  }
  
  // Check site_visits columns
  const r = await supabase.from('site_visits').select('*').limit(1);
  if (r.data && r.data.length > 0) {
    console.log('\nsite_visits columns:', Object.keys(r.data[0]));
  } else {
    console.log('\nsite_visits: empty table or error', r.error?.message);
  }

  // Check comments columns
  const r2 = await supabase.from('comments').select('*').limit(1);
  if (r2.data && r2.data.length > 0) {
    console.log('comments columns:', Object.keys(r2.data[0]));
  } else {
    console.log('comments: empty or error', r2.error?.message);
  }

  // Check reactions columns
  const r3 = await supabase.from('reactions').select('*').limit(1);
  if (r3.data && r3.data.length > 0) {
    console.log('reactions columns:', Object.keys(r3.data[0]));
  } else {
    console.log('reactions: empty or error', r3.error?.message);
  }
}
test();
