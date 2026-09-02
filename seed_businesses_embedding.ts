import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './src/utils/embedding';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Fetching businesses from Supabase...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .is('embedding', null)
    .limit(100);

  if (error) {
    console.error('Error fetching businesses:', error);
    return;
  }

  if (!businesses || businesses.length === 0) {
    console.log('No businesses found needing embeddings.');
    return;
  }

  console.log(`Found ${businesses.length} businesses. Generating embeddings using AI Core...`);

  for (const b of businesses) {
    const textToEmbed = `${b.name} ${b.category} ${b.region || ''} ${b.pet_size || ''} ${b.price_range || ''} ${b.address || ''}`.trim();
    
    try {
      const embeddingArray = await generateEmbedding(textToEmbed);
      if (embeddingArray) {
        // Update DB
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ embedding: JSON.stringify(embeddingArray) })
          .eq('id', b.id);

        if (updateError) {
          console.error(`Failed to update ${b.name}:`, updateError);
        } else {
          console.log(`✅ Embedded: ${b.name}`);
        }
      } else {
        console.warn(`⚠️ Engine returned null for ${b.name}`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${b.name}:`, err);
    }
  }
  
  console.log('All embeddings completed!');
}

run();
