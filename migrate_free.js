require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running DB Migration...');

  // 1. Update existing posts category 'all' -> 'free'
  const { error: err1 } = await supabase
    .from('posts')
    .update({ category: 'free' })
    .eq('category', 'all');

  if (err1) {
    console.error('Error updating category:', err1);
  } else {
    console.log('Successfully updated category all -> free.');
  }

  // 2. We can't use ALTER TABLE directly via the standard supabase-js client because it uses the REST API which doesn't allow DDL.
  // Instead, I'll use the postgres endpoint if available, or I'll just write the SQL to a file for the user to run if needed.
  // Wait, I can execute SQL through supabase admin / postgres directly if there's a stored procedure, but there isn't.
  // I will write a SQL file `migration_post_type.sql` and ask the user to run it in Supabase SQL editor.
}

runMigration();
