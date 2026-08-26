require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!pixabayKey) {
    console.error('No PIXABAY_API_KEY');
    return;
  }

  // 1. Fetch posts with broken Pixabay URLs
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, headline, link_title, image_url')
    .ilike('image_url', '%pixabay.com%');
    
  if (error) {
    console.error('Failed to fetch posts', error);
    return;
  }

  console.log(`Found ${posts.length} posts to fix.`);

  let successCount = 0;
  let failCount = 0;

  for (const post of posts) {
    // If it's already using webformatURL (has _640 in it), skip
    if (post.image_url.includes('_640.jpg') || post.image_url.includes('_340.jpg')) {
      console.log(`Post ${post.id} seems fine, skipping.`);
      continue;
    }

    try {
      // Use link_title if available, else headline
      let keyword = post.link_title || post.headline || 'news';
      // Clean up punctuation and limit length for better Pixabay results
      keyword = keyword.replace(/[^\w\s가-힣]/g, '').trim().substring(0, 100);

      // We'll just search using lang=ko since the content is mostly Korean
      const pRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=20&lang=ko`);
      
      if (!pRes.ok) {
        throw new Error(`Pixabay returned ${pRes.status}`);
      }
      
      const pData = await pRes.json();
      
      let newImageUrl = null;
      if (pData.hits && pData.hits.length > 0) {
        // Just take the first relevant one
        newImageUrl = pData.hits[0].webformatURL;
      } else {
        // Fallback: search just 'news' if nothing found
        const fbRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=news&image_type=photo&per_page=20&lang=en`);
        const fbData = await fbRes.json();
        if (fbData.hits && fbData.hits.length > 0) {
          const randomIndex = Math.floor(Math.random() * fbData.hits.length);
          newImageUrl = fbData.hits[randomIndex].webformatURL;
        }
      }

      if (newImageUrl) {
        const { error: upErr } = await supabase
          .from('posts')
          .update({ image_url: newImageUrl })
          .eq('id', post.id);
          
        if (upErr) throw upErr;
        console.log(`✅ Fixed post ${post.id}: ${newImageUrl}`);
        successCount++;
      } else {
        console.log(`❌ Couldn't find fallback for post ${post.id}`);
        failCount++;
      }
    } catch (e) {
      console.error(`❌ Error fixing post ${post.id}:`, e);
      failCount++;
    }
  }

  console.log(`\nDone! Fixed: ${successCount}, Failed: ${failCount}`);
}

main();
