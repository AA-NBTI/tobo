import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'
import SimulationArchiveClient from '@/components/admin/SimulationArchiveClient'

export const dynamic = 'force-dynamic'

export default async function SimulationArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/ko')
  }

  // 1. 회차별 마스터 목록 조회 (최신순)
  const { data: runs } = await supabase
    .from('simulation_runs')
    .select('*')
    .order('run_number', { ascending: false })

  // 2. 전체 로그 조회
  const { data: logs } = await supabase
    .from('simulation_logs')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="w-full max-w-6xl mx-auto p-4 py-8 pb-24 text-gray-900">
      {/* 상단 네비게이션 */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs font-bold text-gray-500 hover:text-black">
              관리자 센터
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-bold text-blue-600">품질 회귀 테스트 아카이브</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            📑 7대 페르소나 자율 시뮬레이션 누적 아카이브 색인
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gemma 26B(손님) ↔ Gemma 31B(토보) 1:1 대화 및 Gemini 3.1 & 3.5 이종 모델 교차 감사 결과가 회차별로 영구 축적됩니다.
          </p>
        </div>
      </div>

      {/* 클라이언트 인터랙티브 아카이브 뷰어 */}
      <SimulationArchiveClient initialRuns={runs || []} initialLogs={logs || []} />
    </div>
  )
}
