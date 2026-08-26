require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!pixabayKey) return;

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, headline, content')
    .ilike('content', '%pixabay.com%');
    
  if (error) return;

  let successCount = 0;
  for (const post of posts) {
    let newContent = post.content;
    const regex = /https:\/\/pixabay\.com\/get\/[a-zA-Z0-9_]+_1280\.jpg/gi;
    let match;
    let modified = false;

    const keyword = post.headline ? post.headline.replace(/[^\w\s가-힣]/g, '').trim().substring(0, 100) : 'news';
    const pRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=10&lang=ko`);
    let pData = { hits: [] };
    if (pRes.ok) pData = await pRes.json();
    
    if (pData.hits.length === 0) {
      const fbRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=news&image_type=photo&per_page=10&lang=en`);
      if (fbRes.ok) pData = await fbRes.json();
    }

    let imgIndex = 0;

    newContent = newContent.replace(regex, (fullMatch) => {
      if (pData.hits && pData.hits.length > 0) {
        const hit = pData.hits[imgIndex % pData.hits.length];
        imgIndex++;
        modified = true;
        return hit.webformatURL;
      }
      return fullMatch;
    });

    if (modified) {
      const { error: upErr } = await supabase
        .from('posts')
        .update({ content: newContent })
        .eq('id', post.id);
      if (!upErr) {
        successCount++;
        console.log(`✅ Fixed inline images for post ${post.id}`);
      }
    }
  }

  console.log(`Done! Fixed content for ${successCount} posts.`);
}
main();
