const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
  });
  
  try {
    await client.connect();
    
    const query = `
      -- 1. businesses 테이블에 임베딩 컬럼 추가
      ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS embedding vector(768);

      -- 2. 인덱스 생성
      CREATE INDEX IF NOT EXISTS businesses_embedding_idx
      ON public.businesses USING ivfflat (embedding vector_cosine_ops);

      -- 3. 코사인 유사도 매칭을 위한 RPC 함수 생성
      CREATE OR REPLACE FUNCTION match_businesses(
        query_embedding vector(768),
        match_threshold float,
        match_count int,
        filter_category text DEFAULT NULL,
        filter_region text DEFAULT NULL
      )
      RETURNS TABLE (
        id uuid,
        name text,
        category text,
        address text,
        region text,
        pet_size text,
        price_range text,
        is_active boolean,
        slug text,
        similarity float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          b.id,
          b.name,
          b.category,
          b.address,
          b.region,
          b.pet_size,
          b.price_range,
          b.is_active,
          b.slug,
          1 - (b.embedding <=> query_embedding) AS similarity
        FROM public.businesses b
        WHERE b.is_active = true
          AND b.embedding IS NOT NULL
          AND (filter_category IS NULL OR filter_category = 'UNSUPPORTED' OR b.category = filter_category)
          AND (filter_region IS NULL OR b.region ILIKE '%' || filter_region || '%')
          AND 1 - (b.embedding <=> query_embedding) > match_threshold
        ORDER BY b.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `;
    const res = await client.query(query);
    console.log('Schema updated successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
run();
