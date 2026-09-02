const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// We use dynamic import for the embedding module because it might be ES module
async function run() {
  console.log('Fetching businesses from Supabase...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

  console.log(`Found ${businesses.length} businesses. Generating Cloudflare embeddings...`);
  
  // Import embedding logic from Next.js project
  // Note: Since this is outside Next.js build, we'll just mock the cloudflare call here to be safe and standalone
  
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is missing in .env.local');
    return;
  }

  for (const b of businesses) {
    const textToEmbed = `${b.name} ${b.category} ${b.region || ''} ${b.pet_size || ''} ${b.price_range || ''} ${b.address || ''}`.trim();
    
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-m3`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: [textToEmbed] })
      });
      const data = await res.json();
      
      if (data?.result?.data?.[0]) {
        const raw = data.result.data[0];
        const vec = new Float32Array(768);
        vec.set(raw.slice(0, 768));
        const embeddingArray = Array.from(vec);

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
        console.warn(`⚠️ Cloudflare returned no data for ${b.name}`, data);
      }
    } catch (err) {
      console.error(`❌ Error processing ${b.name}:`, err);
    }
    
    // Slight delay to prevent rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('All embeddings completed!');
}

run();
