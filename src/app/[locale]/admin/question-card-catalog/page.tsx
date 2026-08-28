import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// 파인더(Finder) 토보의 종합 질문카드 라이브러리 (Questionnaire Card Library)
const QUESTION_CARD_CATALOG = [
  {
    category: '1. 이동성 & 공간 접근성 (Mobility & Logistics)',
    targetProfile: '자차 운전자, 도보권 이웃, 대중교통 이용자, 픽업 서비스 희망자',
    cards: [
      {
        cardId: 'CARD_MOBILITY_PARKING',
        cardTitle: '이동 및 주차 편의 선택',
        targetSlot: 'has_car / parking_priority',
        botQuestion: '방문하실 때 전용 주차 공간이나 편리한 진입로가 우선인 매장으로 찾아드릴까요?',
        designStyle: '직관형 그리드 카드 (Icon + Text)',
        options: [
          { label: '넓은 전용 주차 완비 필수', subtext: '자차 이동 / 지상·지하 주차장 완비', tag: 'has_car: true' },
          { label: '집 근처 편한 도보권', subtext: '도보 5~10분 이내 / 대중교통 접근', tag: 'mobility: walking' },
          { label: '도어투도어 픽업 희망', subtext: '직접 방문 어려움 / 샵 픽업 샌딩', tag: 'pickup: true' },
        ]
      },
      {
        cardId: 'CARD_MOBILITY_RADIUS',
        cardTitle: '희망 이동 반경 선택',
        targetSlot: 'preferred_radius',
        botQuestion: '보호자님께서 생각하시는 가장 편안한 이동 거리는 어느 정도인가요?',
        designStyle: '슬라이더/태그형 카드',
        options: [
          { label: '우리 동네 1km 이내 (동네 단골)', subtext: '하단동 도보 생활권', tag: 'radius: 1km' },
          { label: '차량 10~15분 거리 (인접 상권)', subtext: '반경 5km 일대', tag: 'radius: 5km' },
          { label: '거리 무관 (최고 매장이면 어디든)', subtext: '부산 전역 광역 탐색', tag: 'radius: all_city' },
        ]
      }
    ]
  },
  {
    category: '2. 가구 형태 & 다견 케어 (Household & Multi-Pet)',
    targetProfile: '1인 가구, 다둥이(2+마리) 보호자, 친구 동반 방문자',
    cards: [
      {
        cardId: 'CARD_PET_HOUSEHOLD_SCALE',
        cardTitle: '동반 케어 규모 선택',
        targetSlot: 'is_multi_pet / household_scale',
        botQuestion: '혹시 다른 반려견과 함께 동시 케어를 받거나 대기할 수 있는 공간이 필요하신가요?',
        designStyle: '가구형 선택 카드',
        options: [
          { label: '외동 아이 1:1 집중 케어', subtext: '단독 시술 / 전담 집중', tag: 'is_multi_pet: false' },
          { label: '둘 이상 다둥이 동시 케어', subtext: '2마리 이상 동시 예약 및 대기 공간', tag: 'is_multi_pet: true' },
          { label: '지인/친구네 아이와 동반', subtext: '함께 방문하여 미용 대기', tag: 'is_multi_pet: companion' },
        ]
      },
      {
        cardId: 'CARD_PET_SIZE_BREED',
        cardTitle: '반려견 체급 및 견종 분류',
        targetSlot: 'pet_size / breed_category',
        botQuestion: '아이의 품종과 체급을 선택해 주세요. 샵별 전담 스타일리스트를 매칭해 드려요.',
        designStyle: '체급 비주얼 카드',
        options: [
          { label: '소형견 (~5kg)', subtext: '말티즈, 포메라니안, 토이푸들', tag: 'size: small' },
          { label: '중형견 (5~12kg)', subtext: '비숑 프리제, 시바견, 웰시코기', tag: 'size: medium' },
          { label: '대형견 (12kg~)', subtext: '골든 리트리버, 사모예드, 보더콜리', tag: 'size: large' },
          { label: '특수견 / 쇼독', subtext: '스탠다드 푸들, 베들링턴 테리어 등', tag: 'size: specialty' },
        ]
      }
    ]
  },
  {
    category: '3. 심리 성향 & 안심 케어 환경 (Psychology & Care Environment)',
    targetProfile: '예민견, 분리불안견, 사회성 좋은 반려견, 노령견/환견',
    cards: [
      {
        cardId: 'CARD_CARE_ENVIRONMENT',
        cardTitle: '아이 성향 및 케어 환경 선택',
        targetSlot: 'care_environment_priority',
        botQuestion: '우리 아이가 낯선 환경에서 어떤 스타일의 공간을 가장 편안해할까요?',
        designStyle: '안심 무드 카드',
        options: [
          { label: '1:1 단독 프라이빗 룸', subtext: '동시간대 다른 아이 없는 조용한 케어', tag: 'env: solo_private' },
          { label: '통유리 오픈형 안심 케어', subtext: '보호자가 밖에서 실시간 참관 가능', tag: 'env: open_glass' },
          { label: '오픈형 놀이방 연계형', subtext: '미용 전후 친구들과 스트레스 해소', tag: 'env: playground' },
          { label: '스트레스 프리 적응 케어', subtext: '간식 보상 및 교감 우선', tag: 'env: stress_free' },
        ]
      },
      {
        cardId: 'CARD_SENIOR_HEALTH_SAFETY',
        cardTitle: '시니어 건강 및 특수 안전 선택',
        targetSlot: 'health_safety_tier',
        botQuestion: '아이의 연령대나 미용 시 특별히 주의해야 할 건강 이슈가 있으신가요?',
        designStyle: '의료/안전 뱃지 카드',
        options: [
          { label: '10세 이상 노령견 안심 케어', subtext: '2인 1조 보조, 무반동 푹신 매트', tag: 'safety: senior_assist' },
          { label: '슬개골/디스크 관절 주의', subtext: '무리한 자세 지양, 중간 휴식 부여', tag: 'safety: joint_care' },
          { label: '피부 트러블 / 알러지 케어', subtext: '약용 샴푸 및 천연 유기농 성분', tag: 'safety: skin_trouble' },
          { label: '건강하고 씩씩함', subtext: '특이 질환 없음 / 일반 케어', tag: 'safety: normal' },
        ]
      }
    ]
  },
  {
    category: '4. 소비 가치관 & 서비스 프로그램 (Value & Program)',
    targetProfile: '가성비 실속파, 하이엔드 퀄리티파, 웰니스 스파 힐링파',
    cards: [
      {
        cardId: 'CARD_SERVICE_PROGRAM',
        cardTitle: '희망 서비스 프로그램 선택',
        targetSlot: 'service_style',
        botQuestion: '오늘 우리 아이에게 가장 필요한 맞춤 시술은 무엇인가요?',
        designStyle: '대표 시술 카드',
        options: [
          { label: '전체 가위컷 & 스타일링', subtext: '얼굴 디자인컷 및 정밀 가위 케어', tag: 'style: scissor_cut' },
          { label: '프리미엄 탄산 스파 & 목욕', subtext: '각질 제거, 모질 개선, 피부 진정', tag: 'style: spa' },
          { label: '기본 위생 클리핑 (3mm/5mm)', subtext: '깔끔한 전신 클리핑 및 위생 미용', tag: 'style: clipping' },
          { label: '쇼독 / 시그니처 디자인 컷', subtext: '수석 디자이너 1:1 하이엔드 라인', tag: 'style: signature_design' },
        ]
      },
      {
        cardId: 'CARD_SPENDING_TIER',
        cardTitle: '보호자 소비 가치 기준',
        targetSlot: 'spending_orientation',
        botQuestion: '매장을 선택하실 때 가장 중요하게 생각하시는 기준은 무엇인가요?',
        designStyle: '가치관 뱃지 카드',
        options: [
          { label: '가격 거품 없는 정직한 실속', subtext: '가성비 최우선 / 3~4만원대', tag: 'tier: value_economy' },
          { label: '최고급 퀄리티와 전문성', subtext: '비용 무관 / 10만원 이상 하이엔드', tag: 'tier: premium_luxury' },
          { label: '정기 관리 및 정기권 혜택', subtext: '월간 회원권 / 정기 할인', tag: 'tier: membership_regular' },
        ]
      }
    ]
  },
  {
    category: '5. 시간대 & 라이프스타일 패턴 (Schedule Pattern)',
    targetProfile: '퇴근길 직장인, 주말 나들이파, 당일 즉시 예약 희망자',
    cards: [
      {
        cardId: 'CARD_SCHEDULE_TIMING',
        cardTitle: '방문 희망 시간대 선택',
        targetSlot: 'schedule_pattern',
        botQuestion: '보호자님의 일정상 가장 편안한 방문 시간대를 골라주세요.',
        designStyle: '시간표 태그 카드',
        options: [
          { label: '주말 오전 (10:00~13:00)', subtext: '여유로운 주말 나들이 전 케어', tag: 'time: weekend_morning' },
          { label: '주말 오후 (14:00~18:00)', subtext: '토/일 오후 집중 케어 타임', tag: 'time: weekend_afternoon' },
          { label: '평일 퇴근 후 (18:00 이후)', subtext: '퇴근길 픽업 및 야간 운영 매장', tag: 'time: weekday_night' },
          { label: '당일 빠른 예약 (즉시 방문)', subtext: '오늘 비어있는 타임슬롯 매칭', tag: 'time: same_day_instant' },
        ]
      }
    ]
  }
]

export default async function QuestionCardCatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 pb-32 space-y-8">
      {/* 상단 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              ← 관리자 홈
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <Link href="/admin/recommendation-taxonomy" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              추천 기준 트리
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-pink-600 font-bold">질문카드 카탈로그</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
            📇 토보 파인더 질문카드 전수 카탈로그 (Questionnaire Card Library)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            토보가 대화 상황과 고객 연령·성향에 맞춰 꺼내 쓸 수 있도록 사전 설계된 <strong>5대 영역 9종의 표준 질문 카드 전수 데이터베이스</strong>
          </p>
        </div>
      </div>

      {/* ── 1. 핵심 설계 철학 배너 ── */}
      <div className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-wider">
          <span>Questionnaire Asset Library</span>
          <span>•</span>
          <span>Adaptive Multi-Type Cards</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
          &quot;우리가 가진 정답을 고객이 부담 없이 선택하도록 돕는 정교한 질문 카드 카탈로그&quot;
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed max-w-4xl">
          토보는 텍스트 타이핑을 강요하지 않습니다. 고객이 가볍게 탭(Tap)하기만 해도 주차, 다견, 건강, 소비 성향이 백그라운드 DB에 정밀하게 채워지는 <strong>시각적 편의성과 높은 가독성을 갖춘 인터랙티브 카드들</strong>이 상시 대기하고 있습니다.
        </p>
      </div>

      {/* ── 2. 5대 영역별 질문카드 카탈로그 전수 전시 ── */}
      <div className="space-y-8">
        {QUESTION_CARD_CATALOG.map((group, gIdx) => (
          <div key={gIdx} className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* 영역 헤더 */}
            <div className="p-4 sm:p-5 bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-pink-400 font-bold uppercase tracking-wider">
                  DOMAIN #{gIdx + 1}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{group.category}</h3>
                <p className="text-xs text-gray-300 mt-1">
                  <strong>[타겟 프로파일]:</strong> {group.targetProfile}
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-white/10 rounded-lg text-gray-200 shrink-0">
                {group.cards.length}개 질문 카드 등록됨
              </span>
            </div>

            {/* 카드 리스트 */}
            <div className="p-6 space-y-6 divide-y divide-gray-100">
              {group.cards.map((card, cIdx) => (
                <div key={cIdx} className={`space-y-3 ${cIdx > 0 ? 'pt-6' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded font-mono text-[10px]">
                        {card.cardId}
                      </span>
                      <span className="text-sm">{card.cardTitle}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">
                      수집 슬롯: <strong>{card.targetSlot}</strong>
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                    <span className="font-bold text-pink-700 mr-1.5">[토보의 질문 멘트]:</span>
                    &quot;{card.botQuestion}&quot;
                  </div>

                  {/* 실제 프론트엔드에 렌더링될 카드 UI 시뮬레이션 */}
                  <div className="p-4 bg-white rounded-xl border-2 border-gray-200 space-y-2">
                    <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0f172a]" />
                        <span>{card.cardTitle}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">{card.designStyle}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {card.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="p-3 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl transition space-y-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[#0f172a]">{opt.label}</div>
                          <div className="text-[11px] text-[#64748b] leading-tight">{opt.subtext}</div>
                          <div className="text-[9px] text-pink-600 font-mono pt-1">
                            🏷️ {opt.tag}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
