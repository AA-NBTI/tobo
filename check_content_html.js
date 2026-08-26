require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content')
    .ilike('content', '%pixabay.com%')
    .limit(1);
    
  if (!error && data.length > 0) {
    console.log(data[0].content);
  }
}
main();
