require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .ilike('image_url', '%pixabay.com%');
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Total Pixabay posts: ${count}`);
  }
}
main();
