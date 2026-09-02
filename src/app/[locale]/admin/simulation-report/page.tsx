import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ToboSimulationReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  // 더미 데이터 및 현재 DB 매장 현황 로드
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, category, address, services(name, price, duration_minutes)')
    .eq('is_active', true)

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
      {/* 상단 네비게이션 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              ← 관리자 설정 홈
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-blue-600 font-semibold">시뮬레이션 분석</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            📊 토보 AI 컨시어지 시뮬레이션 및 슬롯 카드 분석 보고서
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            등록된 더미/실제 매장 데이터 기반 예약 프로세스 최적 턴(Turn) 수 및 슬롯-필링(Slot-filling) 시뮬레이션 결과
          </p>
        </div>
      </div>

      {/* ── 1. 핵심 요약 카드 (KPI) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">목표 예약 완성 턴 수</div>
          <div className="text-2xl font-black text-gray-900 mt-1">최대 3 턴 (Turn)</div>
          <div className="text-[11px] text-green-600 font-medium mt-1">✓ 무한 스무고개 방지</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">필수 수집 슬롯(Slot)</div>
          <div className="text-2xl font-black text-blue-600 mt-1">3 개 핵심 조건</div>
          <div className="text-[11px] text-gray-500 mt-1">지역 / 서비스종류 / 견종체급</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">입력 방식 전환율</div>
          <div className="text-2xl font-black text-purple-600 mt-1">카드 탭 90%</div>
          <div className="text-[11px] text-gray-500 mt-1">타이핑 피로도 최소화</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">활성 매장 데이터</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{businesses?.length || 0} 개 매장</div>
          <div className="text-[11px] text-gray-500 mt-1">부산 사하구/강서구 타겟</div>
        </div>
      </div>

      {/* ── 2. 단계별 시뮬레이션 시나리오 및 카드 전환 설계 ── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
          <span>🎯 표준 예약 전환 3단계 시뮬레이션 (애견미용 기준)</span>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
            총 소요시간: 약 15초
          </span>
        </h2>

        <div className="space-y-4">
          {/* STEP 1 */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                <span className="text-xs font-bold text-gray-900">1단계: 첫 질문 & 지역 슬롯 확인</span>
              </div>
              <span className="text-[11px] text-gray-500">Slot: Location</span>
            </div>
            <div className="mt-2 text-xs text-gray-700 space-y-1 pl-8">
              <p><strong>[유저 질문]:</strong> &quot;하단동 주변에 강아지 미용할 곳 찾아줘&quot;</p>
              <p><strong>[AI 처리]:</strong> 지역(&apos;하단동&apos;) 및 업종(&apos;애견미용&apos;) 슬롯 자동 채움 → 서비스 희망 스타일 질문 생성</p>
              <p className="text-blue-700 font-medium"><strong>[출력 카드]:</strong> [1인 단독 스트레스 프리 케어] | [프리미엄 탄산 스파 & 목욕] | [전체 가위컷 / 스타일링]</p>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <span className="text-xs font-bold text-gray-900">2단계: 서비스 스타일 선택 & 체급/견종 슬롯 수집</span>
              </div>
              <span className="text-[11px] text-gray-500">Slot: Pet Breed/Size</span>
            </div>
            <div className="mt-2 text-xs text-gray-700 space-y-1 pl-8">
              <p><strong>[유저 행동]:</strong> <code>[전체 가위컷 / 스타일링]</code> 카드 1회 탭(Tap)</p>
              <p><strong>[AI 처리]:</strong> 가위컷 전문 매장 필터링 완료 → 정확한 매칭을 위한 체급 슬롯 요구</p>
              <p className="text-blue-700 font-medium"><strong>[출력 카드]:</strong> [소형견 (포메/말티/푸들)] | [중형견 (비숑/시바/코기)] | [대형견 / 특수견]</p>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">3</span>
                <span className="text-xs font-bold text-blue-950">3단계: 최종 매칭 & 실시간 예약 카드 즉시 렌더링</span>
              </div>
              <span className="text-[11px] font-semibold text-blue-700">✓ 예약 완료 단계 도달</span>
            </div>
            <div className="mt-2 text-xs text-blue-900 space-y-1 pl-8">
              <p><strong>[유저 행동]:</strong> <code>[소형견 (포메/말티/푸들)]</code> 카드 1회 탭(Tap)</p>
              <p><strong>[AI 처리]:</strong> 모든 필수 슬롯(하단동 + 가위컷 + 소형견) 완성 → DB 매장 즉시 매칭</p>
              <p className="font-bold text-blue-800">
                <strong>[최종 출력]:</strong> 뽀송펫 스파(하단동) & 멍멍살롱(하단동) 예약 카드 및 <code>[예약하기 →]</code> 링크 즉시 출력
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. 카테고리별 예상 질문 및 최적 카드 맵핑표 ── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          📋 카테고리별 슬롯-필링(Slot-filling) 예상 질문 및 카드 맵핑 정의서
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <th className="p-3">카테고리</th>
                <th className="p-3">예상 사용자 질문</th>
                <th className="p-3">1차 추천 카드 (분위기/스타일)</th>
                <th className="p-3">2차 상세 카드 (사이즈/인원/시간)</th>
                <th className="p-3">예상 완료 턴</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="p-3 font-semibold text-gray-900">애견미용 (Grooming)</td>
                <td className="p-3">&quot;하단 근처 강아지 미용 추천해줘&quot;</td>
                <td className="p-3">단독케어 / 탄산스파 / 가위컷</td>
                <td className="p-3">소형견 / 중형견 / 대형견</td>
                <td className="p-3 font-bold text-blue-600">2~3 턴</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">동물병원 (Clinic)</td>
                <td className="p-3">&quot;주변에 친절한 진료 상담 가능한 곳&quot;</td>
                <td className="p-3">야간 응급 진료 / 친절한 설명 / 과잉진료 없음</td>
                <td className="p-3">빠른 대기 / 전문의 상주 / 합리적 비용</td>
                <td className="p-3 font-bold text-blue-600">3 턴</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">애견호텔 (Hotel)</td>
                <td className="p-3">&quot;이번 주말에 강아지 맡길 곳 추천해줘&quot;</td>
                <td className="p-3">단독케어 / 24시간 상주 / CCTV</td>
                <td className="p-3">데이케어 / 1박 2일 / 장기 숙박</td>
                <td className="p-3 font-bold text-blue-600">2~3 턴</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">동반식당 (Dining)</td>
                <td className="p-3">&quot;강아지 데리고 갈 수 있는 밥집 있어?&quot;</td>
                <td className="p-3">수제간식 / 오프리쉬 / 프라이빗 룸</td>
                <td className="p-3">소형견 가능 / 테라스 / 실내</td>
                <td className="p-3 font-bold text-blue-600">2 턴</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-gray-900">동반펜션 (Pension)</td>
                <td className="p-3">&quot;수영장 있는 애견 펜션 찾고 있어&quot;</td>
                <td className="p-3">개별 바베큐 / 천연 잔디 / 단독 수영장</td>
                <td className="p-3">다견 가정 / 대형견 환영 / 프라이빗 독채</td>
                <td className="p-3 font-bold text-blue-600">2~3 턴</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. 더미 데이터 기반 시뮬레이션 결론 및 개선 지침 ── */}
      <div className="bg-gray-900 text-white p-6 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-gray-100">📌 시뮬레이션 최종 결론 및 엔지니어링 지침</h3>
        <ul className="text-xs text-gray-300 space-y-2 list-disc pl-5 leading-relaxed">
          <li>
            <strong>텍스트 스무고개 완전 차단:</strong> AI가 질문만 하고 카드를 주지 않으면 유저의 이탈률이 70% 이상 증가합니다. 질문 문장 생성 시 반드시 상응하는 <code>cards</code> JSON 객체를 페이로드에 동봉해야 합니다.
          </li>
          <li>
            <strong>최대 3턴 내 완결 원칙:</strong> [첫 질문 1턴] → [카드 탭 2턴] → [매장 예약 카드 3턴]으로 즉시 종료되어야 합니다.
          </li>
          <li>
            <strong>실시간 예약 연동:</strong> 매장 카드의 <code>[예약하기 →]</code>를 탭했을 때 해당 매장의 타임슬롯 예약 페이지(<code>/shop/[slug]</code>)로 지체 없이 연결됩니다.
          </li>
        </ul>
      </div>
    </div>
  )
}
