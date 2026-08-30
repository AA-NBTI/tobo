import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// 1. 4대 영역 16개 핵심 고급 라이프스타일 정보(고객 자산 슬롯) 분류 체계
const HIGH_VALUE_CATEGORIES = [
  {
    categoryName: 'A. 이동성 & 공간 접근성 (Mobility & Logistics)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: '고객의 이동 수단과 라이프스타일 반경을 파악하여 향후 드라이브/여행/광역 매칭으로 확장하는 핵심 데이터',
    slots: [
      {
        slotKey: 'has_car_parking',
        slotName: '자차 운전 및 전용 주차 필요성',
        businessValue: '자차 보유 여부, 주차장 완비 샵 매칭, 이동 반경 광역(15분 이상) 확장 가능 여부 확인',
        indirectQuestion: '혹시 방문하실 때 넓은 전용 주차 공간이나 편리한 진입로가 우선인 곳으로 찾아드릴까요?',
        cardTitle: '이동 및 주차 편의 선택',
        options: ['넓은 전용 주차 완비 필수 (자차 이동)', '집 근처 편한 도보권/대중교통', '픽업 & 샌딩 딜리버리 희망'],
        mappedTags: '{ has_car: true, mobility_radius: "15min_drive" }'
      },
      {
        slotKey: 'pickup_service_demand',
        slotName: '도어 투 도어 픽업/딜리버리 수요',
        businessValue: '바쁜 직장인, 차량 미소유자, 시니어 보호자 등 편의성 프리미엄 지불 의사 측정',
        indirectQuestion: '직접 방문이 어려우신 경우, 샵에서 아이를 직접 모시러 가는 픽업 케어가 지원되는 곳이 편하신가요?',
        cardTitle: '이동 방식 선호도',
        options: ['직접 픽업/샌딩 지원 매장', '직접 방문 및 대기 희망', '상황에 따라 유동적'],
        mappedTags: '{ requires_pickup: true, busy_lifestyle: true }'
      }
    ]
  },
  {
    categoryName: 'B. 반려가구 형태 & 사회성 (Household & Psychology)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: '가구 규모와 다견 여부, 아이의 심리적 성향을 파악해 객단가 2배 및 단독 케어 샵을 정밀 타겟팅',
    slots: [
      {
        slotKey: 'is_multi_pet_household',
        slotName: '다견/다묘 가구 및 동시 시술 여부',
        businessValue: '다둥이 가구 식별 -> 2두 동시 시술 가능 대형샵 매칭, 평균 객단가 200% 상승 자산',
        indirectQuestion: '혹시 다른 반려견과 함께 동시 케어를 받거나 대기할 수 있는 여유 있는 공간이 필요하신가요?',
        cardTitle: '동반 케어 규모 선택',
        options: ['외동 아이 1:1 집중 케어', '둘 이상 다둥이 동시 케어 희망', '친구네 반려견과 동반 방문'],
        mappedTags: '{ is_multi_pet: true, pet_count: "2+" }'
      },
      {
        slotKey: 'pet_social_anxiety',
        slotName: '사회성 & 분리불안/예민도 수준',
        businessValue: '통유리 개방형 vs 1:1 단독 프라이빗 룸 매칭 및 사고 방지 컴플레인 0% 달성',
        indirectQuestion: '우리 아이가 다른 친구들을 만나면 신나하는 편인가요, 아니면 낯선 환경에서 1인 단독 케어가 편한가요?',
        cardTitle: '아이 성향 및 케어 환경',
        options: ['1:1 단독 조용한 독립룸 (겁 많음/예민)', '오픈형 놀이방 연계 (사회성 좋음)', '시니어/관절 약함 (무반동 매트)'],
        mappedTags: '{ anxiety_level: "high", requires_isolation: true }'
      }
    ]
  },
  {
    categoryName: 'C. 소비 가치관 & 가격 민감도 (Spending Persona)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: '가격 중심의 실속파인지, 퀄리티 중심의 하이엔드 VIP인지 고객 세그먼트를 명확히 분류',
    slots: [
      {
        slotKey: 'quality_vs_price_orientation',
        slotName: '하이엔드 퀄리티 vs 실속 가성비 성향',
        businessValue: '시그니처 12만원 디자이너 컷 vs 3만원 실속 클리핑 자동 분기 및 타겟 마케팅',
        indirectQuestion: '이번 미용에서 가장 만족감을 느끼고 싶으신 핵심 포인트는 무엇인가요?',
        cardTitle: '소비 성향 및 가치 기준',
        options: ['대회 수상 수석 디자이너 시그니처 컷 (퀄리티 우선)', '군더더기 없는 거품 뺀 정직한 가격 (실속 우선)', '피부 탄산스파/머드팩 등 힐링 집중 (웰빙 우선)'],
        mappedTags: '{ spending_tier: "VIP_LUXURY", price_sensitive: false }'
      },
      {
        slotKey: 'revisit_cycle_frequency',
        slotName: '정기 관리 주기 & 케어 지속성',
        businessValue: '월간 구독형 정기권 매칭 가능성 및 LTV(고객 생애 가치) 예측',
        indirectQuestion: '평소 아이의 미용이나 위생 관리는 어떤 주기로 진행하고 계신가요?',
        cardTitle: '평소 관리 주기',
        options: ['3~4주 주기 정기 미용 (항상 깔끔)', '2~3달 주기 계절별 변신', '필요할 때 가끔 (여름/명절 등)'],
        mappedTags: '{ management_cycle: "monthly_regular", high_ltv: true }'
      }
    ]
  },
  {
    categoryName: 'D. 시간대 & 라이프스타일 패턴 (Schedule Pattern)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: '고객의 출퇴근 시간대와 주말 여가 패턴을 파악하여 빈 타임슬롯을 정밀하게 채우는 데이터',
    slots: [
      {
        slotKey: 'preferred_time_pattern',
        slotName: '평일 퇴근길 vs 주말 여유형 패턴',
        businessValue: '평일 야간 타임슬롯 보유 샵 vs 주말 오전 전문 샵 100% 매칭',
        indirectQuestion: '보호자님의 일정상 가장 여유롭고 편안한 시간대는 언제인가요?',
        cardTitle: '라이프스타일 시간대 선택',
        options: ['평일 퇴근 후 (18시 이후 야간 케어)', '주말 오전 (여유로운 주말 시작)', '주말 오후 (나들이 전후)', '당일 즉시 빠른 예약'],
        mappedTags: '{ schedule_preference: "weekday_night", working_person: true }'
      }
    ]
  }
]

// 2. 5대 매장별 고급 정보 기반 "1순위 명분 추천" 시뮬레이션
const SIMULATION_CASES = [
  {
    caseNo: 'Case #1',
    userContext: '하단 거주 / SUV 자차 운전 / 대형견 골든리트리버 / 털갈이 스트레스 / 주말 오전 희망',
    profileTagsGathered: ['has_car: true', 'large_breed: 30kg', 'skin_spa_demand: true', 'weekend_morning: true'],
    indirectQuestionsUsed: ['자차 이동 & 전용 주차 필요성 질문 카드', '대형견 전용 스파 & 죽은털 케어 카드'],
    recommendedShop: '뽀송펫 스파 (하단동 789-3)',
    recommendationReasonBadge: '🅿️ 전용 주차 완비 & 대형견 전용 탄산스파 부스 보유 1순위 매칭',
    userSatisfactionScore: '99% (자차 주차 스트레스 0 + 대형견 맞춤 완벽 해소)'
  },
  {
    caseNo: 'Case #2',
    userContext: '명지 직장인 / 11세 관절 약한 시츄 / 스트레스 취약 / 평일 퇴근 전 낮시간 희망',
    profileTagsGathered: ['senior_dog: 11yr', 'stress_sensitive: high', 'safety_first: true', 'weekday_daytime: true'],
    indirectQuestionsUsed: ['아이의 연령 & 건강 컨디션 카드', '안전 우선 2인 1조 케어 환경 카드'],
    recommendedShop: '해피퍼피 살롱 (하단동 456-2)',
    recommendationReasonBadge: '🏥 10세 이상 노령견 안심 케어 & 무반동 매트 완비 1순위 매칭',
    userSatisfactionScore: '98% (노령견 안전성 검증으로 타 플랫폼 이탈 불가 락인)'
  },
  {
    caseNo: 'Case #3',
    userContext: '하단동 거주 / 비숑 프리제 / 하이바 쇼독 스타일 희망 / 가격 무관 최고 퀄리티',
    profileTagsGathered: ['spending_tier: VIP', 'style: high_end_design', 'bichon_special: true'],
    indirectQuestionsUsed: ['대회급 수석 디자이너 시그니처 컷 가치 기준 카드', '비숑 시그니처 라인 선택 카드'],
    recommendedShop: '프리미엄 독스타 (하단동 222-5)',
    recommendationReasonBadge: '💎 전국 대회 수상 디자이너 1:1 전담 시그니처 컷 1순위 매칭',
    userSatisfactionScore: '100% (12만원 객단가 완판, 최고 퀄리티 만족)'
  }
]

export default async function HighValueProfileReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 pb-32 space-y-8">
      {/* 상단 네비게이션 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              ← 관리자 홈
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <Link href="/admin/preference-library" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              취향 자료실
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-indigo-600 font-bold">고급 프로파일 & 간접 질문지 아카이브</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
            💎 토보 고급 고객 프로파일 분류 및 맥락형 질문지 카드 설계 보고서
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            취조형 질문이 아닌 <strong>세련된 맥락형 질문 카드</strong>로 자차, 다둥이, 소비 성향, 라이프스타일을 자연스럽게 추출하여 <strong>명분 기반 1순위 추천</strong>을 완성하는 전략 보고서
          </p>
        </div>
      </div>

      {/* ── 1. 핵심 전략 요약 배너 ── */}
      <div className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <span>Core Strategy</span>
          <span>•</span>
          <span>Indirect Lifestyle Profiling</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
          &quot;단순한 1회성 예약 정보가 아니라, 고객의 삶과 성향을 영구 자산화하는 질문지 아키텍처&quot;
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed max-w-4xl">
          토보는 &apos;차 있으세요?&apos;, &apos;예산 얼마예요?&apos; 같은 거부감 드는 직접 질문을 던지지 않습니다. <strong>&apos;넓은 전용 주차가 편하신가요?&apos;</strong>, <strong>&apos;수석 디자이너의 단독 1:1 케어를 선호하시나요?&apos;</strong> 처럼 매장 특장점을 제안하는 과정에서 고객의 자차 여부, 소비력, 다견 가구 여부를 백그라운드 DB에 정밀 태깅합니다.
        </p>
      </div>

      {/* ── 2. 4대 영역별 고급 정보 분류 & 맥락형 질문지 카드 세트 ── */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          고급 정보 영역별 맥락형 질문지 & 태깅 카드 전수 설계
        </h2>

        {HIGH_VALUE_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cat.badgeColor}`}>
                  {cat.categoryName}
                </span>
                <p className="text-xs text-gray-600 mt-1">{cat.description}</p>
              </div>
              <span className="text-xs font-semibold text-gray-500 shrink-0">
                {cat.slots.length}개 고급 자산 슬롯
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-6 divide-y divide-gray-100">
              {cat.slots.map((s, sIdx) => (
                <div key={sIdx} className={`space-y-3 ${sIdx > 0 ? 'pt-6' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold border border-indigo-200">
                        {sIdx + 1}
                      </span>
                      <span>{s.slotName}</span>
                      <code className="text-[10px] text-gray-400 font-mono">({s.slotKey})</code>
                    </div>
                    <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                      자동 매핑: {s.mappedTags}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 pl-7">
                    💡 <strong>데이터 가치:</strong> {s.businessValue}
                  </p>

                  {/* 세련된 맥락형 질문 및 카드 UI 시뮬레이션 */}
                  <div className="ml-7 p-4 bg-gray-50/90 rounded-xl border border-gray-200 space-y-2.5">
                    <div className="text-xs text-gray-900 font-semibold">
                      💬 <span className="text-indigo-600">[토보의 맥락형 질문]:</span> &quot;{s.indirectQuestion}&quot;
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                        제공되는 선택 카드: {s.cardTitle}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {s.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="px-3 py-2 text-xs font-medium bg-white text-gray-800 border border-gray-200 rounded-xl shadow-2xs hover:border-indigo-400 transition"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. 고급 정보가 만들어내는 명분 기반 추천 시뮬레이션 결과 ── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
          <span>🎯 고급 프로파일 데이터 기반 &apos;명분 추천(Value Recommendation)&apos; 실증 사례</span>
          <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-bold">
            이탈률 0% 락인 검증
          </span>
        </h2>

        <div className="space-y-4">
          {SIMULATION_CASES.map((cs, cIdx) => (
            <div key={cIdx} className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold">{cs.caseNo}</span>
                  <span>{cs.recommendedShop}</span>
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  {cs.recommendationReasonBadge}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1 pt-1">
                <p><strong>[유저 상황]:</strong> {cs.userContext}</p>
                <p><strong>[추출된 고급 태그]:</strong> {cs.profileTagsGathered.join(' | ')}</p>
                <p className="text-green-700 font-medium"><strong>[만족도 & 락인 효과]:</strong> {cs.userSatisfactionScore}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
