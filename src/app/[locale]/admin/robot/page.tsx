import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

import { createAiBot } from '../actions'
import { isAdmin } from '@/utils/auth'

import BotBuilder from '@/components/admin/BotBuilder'
import AdminFilter from '@/components/admin/AdminFilter'
import AutoBotButton from '@/components/admin/AutoBotButton'
import Pagination from '@/components/Pagination'
import { getTranslations, getLocale } from 'next-intl/server'
import UserBadge from '@/components/UserBadge'
import RobotTableClient from '@/components/admin/RobotTableClient'
import RobotHeaderButtons from '@/components/admin/RobotHeaderButtons'
import ForceRunForm from '../ForceRunForm'
import { forceAiPost } from '../actions'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string, page?: string, query?: string, category?: string, sortBy?: string, badge?: string }> }) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const boundForceAiPostPro = forceAiPost.bind(null, locale, 'pro')
  const boundForceAiPostLite = forceAiPost.bind(null, locale, 'lite')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { tab = 'list', page = '1', query = '', category = 'all', sortBy = 'name_asc', badge = 'all' } = await searchParams
  const currentPage = parseInt(page, 10) || 1
  const limit = 15
  const offset = (currentPage - 1) * limit

  // 전역 설정 (자동생성 정보) 가져오기
  const { data: siteSettings } = await supabase.from('site_settings').select('is_auto_bot_active, auto_bot_target_count, is_auto_feed_active, auto_feed_target_count').eq('id', 'global').single()

  // 현재 대기 중인 [자동생성/paused] 오토봇 개수 카운트
  const { count: pendingBotCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('is_ai', true)
    .eq('status', 'paused')

  // 현재 대기 중인 [검토대기/pending_review] 피드 버퍼링 개수 카운트
  const { count: pendingFeedCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')
  let aiBots: any[] = []
  let count: number | null = 0
  let totalPages = 0

  if (tab === 'list' || tab === 'suspended' || tab === 'badges' || tab === 'autobot') {
    let dbQuery = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('is_ai', true)

    if (tab === 'suspended') {
      dbQuery = dbQuery.eq('status', 'banned')
    } else if (tab === 'autobot') {
      dbQuery = dbQuery.eq('status', 'paused')
    } else {
      // 'list' or 'badges'
      dbQuery = dbQuery.or('status.eq.active,status.is.null')
    }

    if (query) {
      dbQuery = dbQuery.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    }
    
    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category)
    }

    if (badge && badge !== 'all') {
      dbQuery = dbQuery.contains('badges', [badge])
    }

    if (sortBy === 'name_asc') {
      dbQuery = dbQuery.order('display_name', { ascending: true, nullsFirst: false })
    } else {
      // recent
      dbQuery = dbQuery.order('created_at', { ascending: false, nullsFirst: false })
    }
    // secondary sort
    dbQuery = dbQuery.order('ai_model_provider', { ascending: false, nullsFirst: false }).order('username', { ascending: true })

    const { data, count: dbCount } = await dbQuery.range(offset, offset + limit - 1)
    aiBots = data || []
    count = dbCount
    totalPages = Math.ceil((count || 0) / limit)
  }

  const { Link: NextLink } = await import('@/i18n/routing')
  const { default: RobotActionButtons } = await import('@/components/admin/RobotActionButtons')

  // 검토대기 피드 개수 조회
  const { count: pendingCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending_review'])

  return (
    <>
      <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* 상단 메인 타이틀 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 whitespace-nowrap">
              관리센터
            </h1>
            <AutoBotButton mode="manual" />
          </div>
          <div className="flex items-center">
            <ForceRunForm actionPro={boundForceAiPostPro} actionLite={boundForceAiPostLite} pendingCount={pendingFeedCount || 0} />
          </div>
        </div>

        {/* 탭 헤더 네비게이션 및 우측 검토대기 버튼 */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          <Link 
            href="/admin/robot?tab=list" 
            className={`flex items-center justify-center px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition ${tab === 'list' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/70'}`}
          >
            📋 로봇 목록
          </Link>
          <Link 
            href="/admin/robot?tab=suspended" 
            className={`flex items-center justify-center px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition ${tab === 'suspended' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/70'}`}
          >
            🚫 정지 로봇
          </Link>
          <Link 
            href="/admin/robot?tab=badges" 
            className={`flex items-center justify-center px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition ${tab === 'badges' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700 hover:bg-blue-100/70'}`}
          >
            🎖️ 로봇 뱃지
          </Link>
          <Link 
            href="/admin/robot?tab=builder" 
            className={`flex items-center justify-center px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition ${tab === 'builder' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/70'}`}
          >
            🛠️ 로봇 빌더
          </Link>
          <Link 
            href="/admin/robot?tab=portfolio" 
            className={`flex items-center justify-center px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition ${tab === 'portfolio' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-100/70'}`}
          >
            📊 포트폴리오
          </Link>
          <Link 
            href="/admin/robot?tab=autobot" 
            className={`flex items-center justify-center px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition ${tab === 'autobot' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-100/70'}`}
          >
            🤖 자동생성
          </Link>

          <Link
            href="/admin/content?tab=pending_review"
            className={`px-3.5 h-9 text-xs sm:text-sm font-bold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              (pendingCount || 0) > 0 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs' 
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            <span>🚨 피드 검토</span>
            {(pendingCount || 0) > 0 && (
              <span className="bg-white text-red-700 text-[11px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>

        {/* 2. Tab Content */}
        {tab === 'portfolio' && (
          await (async () => {
            const { data: allBots } = await supabase
              .from('accounts')
              .select('id, display_name, username, tier, type_code, category, existence_category, avatar_url')
              .eq('is_ai', true)
              .order('created_at', { ascending: false });
            
            const PortfolioDashboardClient = (await import('@/components/admin/PortfolioDashboardClient')).default;
            return <PortfolioDashboardClient aiBots={allBots || []} />;
          })()
        )}

        {tab === 'builder' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BotBuilder onSubmit={createAiBot} />
          </div>
        )}

        {(tab === 'list' || tab === 'suspended' || tab === 'badges' || tab === 'autobot') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {tab === 'autobot' && (
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                    🤖 봇 자동생성 & 피드 버퍼링 제어 센터
                  </h3>
                  <p className="text-xs text-indigo-700/80 mt-0.5">
                    오토봇 자동 생성 및 검토 대기 임시 피드 버퍼링 목표 수치를 설정하고 제어합니다.
                  </p>
                </div>
                <AutoBotButton 
                  mode="cron"
                  initialIsActive={siteSettings?.is_auto_bot_active || false} 
                  initialTargetCount={siteSettings?.auto_bot_target_count || 29}
                  initialFeedIsActive={siteSettings?.is_auto_feed_active || false}
                  initialFeedTargetCount={siteSettings?.auto_feed_target_count || 19}
                  pendingBotCount={pendingBotCount || 0}
                  pendingFeedCount={pendingFeedCount || 0}
                />
              </div>
            )}
            <RobotTableClient aiBots={aiBots || []} currentTab={tab} />
            <Pagination totalPages={totalPages} currentPage={currentPage} />
            <div className="border-t border-gray-100 pt-4 mt-2">
              <AdminFilter />
            </div>
          </div>
        )}
      </div>
    </>
  )
}