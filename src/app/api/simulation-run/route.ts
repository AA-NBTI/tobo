import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeYieldRegressionSuite } from '@/modules/tobo/test-suite/yield-runner';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json().catch(() => ({}));
    const versionTag = body.versionTag || 'v9.04.2';

    const result = await executeYieldRegressionSuite(supabaseAdmin, versionTag);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('API Run Yield Regression Suite Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
