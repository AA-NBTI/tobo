require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function wipeData() {
  console.log("Wiping posts...");
  const { error: err1 } = await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error("Error wiping posts:", err1);
  
  console.log("Wiping AI accounts...");
  const { error: err2 } = await supabase.from('accounts').delete().eq('is_ai', true);
  if (err2) console.error("Error wiping AI accounts:", err2);

  console.log("Data wipe complete.");
}
wipeData();
