require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, image_url')
    .ilike('image_url', '%pixabay.com%')
    .limit(10);
    
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
main();
