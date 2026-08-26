import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function syncHashtags() {
  console.log('Fetching all posts...');
  const { data: posts, error } = await supabase.from('posts').select('id, headline, content');
  
  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }
  
  console.log(`Found ${posts?.length} posts. Parsing hashtags...`);
  
  const extractHashtags = (text) => {
    if (!text) return [];
    const regex = /#[\w가-힣]+/g;
    const matches = text.match(regex);
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : [];
  };

  let processed = 0;
  for (const post of posts) {
    const tags = Array.from(new Set([...extractHashtags(post.headline), ...extractHashtags(post.content)]));
    
    if (tags.length > 0) {
      for (const tag of tags) {
        let tagId;
        const { data: existingTag } = await supabase.from('hashtags').select('id, count').eq('name', tag).single();
        
        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag } = await supabase.from('hashtags').insert({ name: tag, count: 1 }).select('id').single();
          if (newTag) tagId = newTag.id;
        }
        
        if (tagId) {
          const { data: link } = await supabase.from('post_hashtags').select('post_id').eq('post_id', post.id).eq('hashtag_id', tagId).single();
          if (!link) {
            await supabase.from('post_hashtags').insert({ post_id: post.id, hashtag_id: tagId });
          }
        }
      }
    }
    processed++;
    if (processed % 10 === 0) console.log(`Processed ${processed}/${posts.length} posts...`);
  }
  console.log('Done syncing hashtags!');
}

syncHashtags();
