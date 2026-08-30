const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// 1. Direct PG Connection via DATABASE_URL if available, or direct Supabase pooler
async function runMigration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = refMatch ? refMatch[1] : '';

  const dbUrl = process.env.DATABASE_URL || `postgresql://postgres.${ref}:your-db-password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;
  
  console.log('Database target:', url);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 테이블 생성 및 RLS 정책 적용
  const ddl = `
    CREATE TABLE IF NOT EXISTS public.tobo_unmet_demands (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
      session_id uuid REFERENCES public.tobo_sessions(id) ON DELETE SET NULL,
      keyword text NOT NULL,
      category_guess text,
      user_note text,
      notified boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE public.tobo_unmet_demands ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all tobo_unmet_demands" ON public.tobo_unmet_demands;
    CREATE POLICY "Allow all tobo_unmet_demands" ON public.tobo_unmet_demands FOR ALL USING (true) WITH CHECK (true);
    GRANT ALL ON public.tobo_unmet_demands TO anon, authenticated, service_role;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: ddl });
    if (error) {
      console.log('RPC execution info (fallback to client check):', error.message);
    } else {
      console.log('RPC executed successfully:', data);
    }
  } catch (err) {
    console.log('Direct RPC catch:', err.message);
  }

  // 테이블 존재 및 동작 테스트
  const { data: testData, error: testErr } = await supabase.from('tobo_unmet_demands').select('*').limit(1);
  if (testErr) {
    console.log('Table needs creation:', testErr.message);
  } else {
    console.log('✅ tobo_unmet_demands table is ACTIVE and ready! Count:', testData?.length);
  }
}

runMigration();
