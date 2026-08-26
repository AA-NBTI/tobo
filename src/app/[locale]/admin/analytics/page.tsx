import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import PremiumAnalyticsCharts from '@/components/PremiumAnalyticsCharts'
import CoreGrowthMetrics from '@/components/CoreGrowthMetrics'
import { isAdmin } from '@/utils/auth'
import { getRankingStats, resetUserScore } from '../actions'
import RankingCharts from '@/components/admin/RankingCharts'
import ResetButton from '@/components/admin/ResetButton'
import RankingTablesClient from '@/components/admin/RankingTablesClient'

export default async function AnalyticsDashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'rank' } = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  // --- 랭킹보드 탭 로직 ---
  if (tab === 'rank') {
    let accounts: any[] = []
    let errorMsg = null
    try {
      accounts = await getRankingStats()
    } catch (err: any) {
      errorMsg = err.message || 'Unknown error'
    }

    return (
      <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Inner Tabs: 랭킹보드 - 이용현황 순으로 순서 배치 */}
        <div className="flex flex-row gap-2 border-b border-gray-200 pb-2">
          <Link 
            href="/admin/analytics?tab=rank" 
            className={`px-4 py-2 text-sm font-bold rounded-t-lg ${(tab as string) === 'rank' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            랭킹보드
          </Link>
          <Link 
            href="/admin/analytics?tab=overview" 
            className={`px-4 py-2 text-sm font-bold rounded-t-lg ${(tab as string) === 'overview' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            이용현황
          </Link>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-b-xl shadow-sm border border-gray-100 border-t-0 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">통합 랭킹 대시보드</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-500">휴먼 및 로봇의 활동 점수 랭킹 현황입니다.</p>
            </div>
          </div>

          {errorMsg ? (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl font-bold">
              에러가 발생했습니다: {errorMsg}
            </div>
          ) : (
            <>
              {/* 화면 최상단에 10개 단위로 구성된 휴먼 랭크 및 로봇 랭크 배치 */}
              <RankingTablesClient accounts={accounts} resetUserScore={resetUserScore} />

              <div className="mt-6 pt-6 border-t border-gray-100">
                <RankingCharts accounts={accounts} />
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // --- 이용현황 탭 로직 (Overview) ---
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. 기본 유저 및 방문자 지표
  const { count: totalUsers } = await supabaseAdmin.from('accounts').select('*', { count: 'exact', head: true })
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todayVisits, error: todayVisitsError } = await supabaseAdmin.from('site_visits').select('session_id').gte('created_at', today.toISOString())
  const uniqueTodayVisitors = todayVisitsError ? 0 : new Set(todayVisits?.map(v => v.session_id)).size

  // 2. 누적 활동량 (게시글, 댓글, 리액션)
  const { count: totalPosts } = await supabaseAdmin.from('posts').select('*', { count: 'exact', head: true })
  const { count: totalComments } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true })
  const { count: totalReactions } = await supabaseAdmin.from('reactions').select('*', { count: 'exact', head: true })

  // 3. DAU (최근 7일) 및 최고 인기 경로
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const { data: recentVisitsRaw, error: recentVisitsError } = await supabaseAdmin.from('site_visits').select('session_id, created_at, path').gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: true })
  const recentVisits = recentVisitsError ? [] : recentVisitsRaw

  const dauMap: Record<string, Set<string>> = {}
  const pathMap: Record<string, number> = {}

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    dauMap[d.toISOString().split('T')[0]] = new Set()
  }

  if (recentVisits) {
    recentVisits.forEach(v => {
      const dateStr = v.created_at.split('T')[0]
      if (dauMap[dateStr]) {
        dauMap[dateStr].add(v.session_id)
      }
      pathMap[v.path] = (pathMap[v.path] || 0) + 1
    })
  }

  const dauData = Object.keys(dauMap).map(date => ({
    date: date.slice(5), // MM-DD
    visits: dauMap[date].size
  }))

  const topPaths = Object.entries(pathMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }))

  // 4. 고급 지표 계산을 위한 30일 데이터 패치
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  // 모든 30일 방문 기록 가져오기
  const { data: visits30dRaw, error: visits30dError } = await supabaseAdmin
    .from('site_visits')
    .select('session_id, user_id, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
  const visits30d = visits30dError ? [] : visits30dRaw

  // MAU (30일 순방문자)
  const uniqueMauSet = new Set(visits30d?.map(v => v.session_id))
  const mau = uniqueMauSet.size || 1 // 0 나누기 방지

  // 스티키니스 (DAU / MAU)
  const dauAvg = (Object.values(dauMap).reduce((sum, set) => sum + set.size, 0) / 7) || 0
  const stickiness = ((dauAvg / mau) * 100).toFixed(1)

  // 파워 유저 (최근 30일 중 15일 이상 접속한 세션)
  const sessionDaysMap: Record<string, Set<string>> = {}
  visits30d?.forEach(v => {
    const dateStr = v.created_at.split('T')[0]
    if (!sessionDaysMap[v.session_id]) sessionDaysMap[v.session_id] = new Set()
    sessionDaysMap[v.session_id].add(dateStr)
  })
  const powerUsersCount = Object.values(sessionDaysMap).filter(days => days.size >= 15).length

  // 인게이지먼트 비율 (최근 30일 활동 유저 비율)
  const { count: recentPosts } = await supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString())
  const { count: recentComments } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString())
  const { count: recentReactions } = await supabaseAdmin.from('reactions').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString())
  
  const totalInteractions = (recentPosts || 0) + (recentComments || 0) + (recentReactions || 0)
  const actionsPerUser = (totalInteractions / mau).toFixed(1)

  // 작성 유저 중복 제거를 위한 데이터 패치
  const { data: postAuthors } = await supabaseAdmin.from('posts').select('author_id').gte('created_at', thirtyDaysAgo.toISOString())
  const { data: commentAuthors } = await supabaseAdmin.from('comments').select('author_id').gte('created_at', thirtyDaysAgo.toISOString())
  const { data: reactionAuthors } = await supabaseAdmin.from('reactions').select('user_id').gte('created_at', thirtyDaysAgo.toISOString())

  const uniquePostAuthors = new Set(postAuthors?.map(p => p.author_id)).size
  const uniqueCommentAuthors = new Set(commentAuthors?.map(c => c.author_id)).size
  const uniqueReactionAuthors = new Set(reactionAuthors?.map(r => r.user_id)).size

  const funnelData = [
    { name: '전체 유저(MAU)', value: mau },
    { name: '리액션 경험', value: uniqueReactionAuthors },
    { name: '댓글 작성', value: uniqueCommentAuthors },
    { name: '게시글 작성', value: uniquePostAuthors }
  ]

  // 5. PostHog 동기화 데이터 패치
  const { data: latestPhData } = await supabaseAdmin
    .from('posthog_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const advancedMetrics = {
    stickiness,
    powerUsersCount,
    actionsPerUser,
    mau,
    avgSessionDuration: latestPhData?.avg_session_duration_seconds || 0,
    retentionRate: latestPhData?.retention_rate_d7 || 0
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Inner Tabs */}
      <div className="flex flex-row gap-2 border-b border-gray-200 pb-2">
        <Link 
          href="/admin/analytics?tab=overview" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'overview' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          이용현황
        </Link>
        <Link 
          href="/admin/analytics?tab=rank" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'rank' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          랭킹보드
        </Link>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-b-xl shadow-sm border border-gray-100 border-t-0 flex flex-col gap-6">
        <div className="mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">서비스 이용현황</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500">
            우리 서비스의 모든 핵심 성장 지표를 한눈에 파악하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          {/* 요약 카드들 */}
          <StatCard title="총 가입 유저" value={`${totalUsers || 0} 명`} color="blue" icon={<UserIcon />} />
          <StatCard title="오늘 순방문자" value={`${uniqueTodayVisitors} 명`} color="green" icon={<EyeIcon />} />
          <StatCard title="총 게시글" value={`${totalPosts || 0} 개`} color="purple" icon={<DocumentIcon />} />
          <StatCard title="총 반응 (댓글/리액션)" value={`${(totalComments || 0) + (totalReactions || 0)} 개`} color="pink" icon={<HeartIcon />} />
        </div>

        <CoreGrowthMetrics metrics={advancedMetrics} />

        <PremiumAnalyticsCharts 
          dauData={dauData} 
          topPaths={topPaths} 
          funnelData={funnelData}
        />
      </div>
    </div>
  )
}

function StatCard({ title, value, color, icon }: { title: string, value: string, color: string, icon: React.ReactNode }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    purple: 'bg-indigo-500',
    pink: 'bg-pink-500',
  }
  
  return (
    <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-gray-100">
      <div className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color as keyof typeof colorClasses]} rounded-xl p-4 shadow-inner`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-semibold text-gray-500 truncate">{title}</dt>
              <dd className="text-3xl font-bold text-gray-900 mt-1">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}
