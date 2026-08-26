const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Running SQL...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES accounts(id);
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    `
  });
  
  if (error) {
    console.error('Error running SQL:', error);
    // If exec_sql doesn't exist, we need to create it first or use REST API
  } else {
    console.log('SQL executed successfully:', data);
  }
}
run();
