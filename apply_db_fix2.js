const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runSQL() {
  const query = `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feed_prompt_reporter TEXT DEFAULT '';`;
  const { error } = await supabaseAdmin.rpc('exec_sql', { query });
  console.log('Error adding column:', error);
}
runSQL();
