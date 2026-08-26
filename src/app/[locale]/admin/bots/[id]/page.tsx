import { createClient } from '@supabase/supabase-js'
import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server'
import BotBuilder from '@/components/admin/BotBuilder'
import BotProfileInspector from '@/components/admin/BotProfileInspector'
import { updateAiBotSettings } from '../../actions'

export default async function BotSettingsPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const t = await getTranslations('Admin')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id, locale } = await params
  setRequestLocale(locale);

  const { data: bot } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!bot || !bot.is_ai) {
    redirect(`/${locale}/admin`)
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 py-10 pb-20">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/admin/robot?tab=list" className="text-gray-500 hover:text-black font-bold text-sm">
          &larr; 로봇 목록으로 돌아가기
        </Link>
        <Link href="/admin/robot?tab=portfolio" className="text-purple-600 hover:text-purple-800 font-bold text-sm">
          📊 포트폴리오로 돌아가기 &rarr;
        </Link>
      </div>

      {/* 봇 세부 인라인 수정 폼 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>⚙️</span> 정체성 / 축 / 규칙 인라인 상세 수정
        </h3>
        <BotBuilder initialData={bot} onSubmit={updateAiBotSettings} />
      </div>

      {/* 봇 종합 정체성 헤더 및 NBTI 자가검증 루프 (맨 하단 위치) */}
      <BotProfileInspector bot={bot} />
    </div>
  )
}