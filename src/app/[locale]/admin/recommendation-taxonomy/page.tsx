import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// ── 계층형 추천 기준 분류 트리 (Recommendation Criteria Taxonomy Tree) ──
const RECOMMENDATION_TAXONOMY_TREE = [
  {
    rootId: 'FACILITY_LOGISTICS',
    rootName: '1. 시설 및 접근성 (Facility & Logistics)',
    description: '공간 스펙, 주차, 이동 수단 등 물리적 접근성과 편의 시설 기준',
    subNodes: [
      {
        subId: 'PARKING_ACCESSIBILITY',
        subName: '주차 및 이동',
        criteriaList: [
          { code: 'CRITERIA_PARKING_DEDICATED', name: '주차우선', desc: '지상/지하 전용 주차 공간 완비 매장', targetAttribute: 'parking: dedicated' },
          { code: 'CRITERIA_TRANSIT_SUBWAY', name: '역세권우선', desc: '지하철역/버스정류장 도보 5분 이내', targetAttribute: 'transit: subway_5min' },
          { code: 'CRITERIA_PICKUP_DELIVERY', name: '픽업우선', desc: '자택 방문 픽업 & 샌딩 도어투도어 지원', targetAttribute: 'service: door_to_door' }
        ]
      },
      {
        subId: 'SPACE_ENVIRONMENT',
        subName: '공간 및 시설 환경',
        criteriaList: [
          { code: 'CRITERIA_FACILITY_CONVENIENCE', name: '편의시설우선', desc: '보호자 대기 라운지, 카페, 드라이룸 완비', targetAttribute: 'amenity: lounge_dryroom' },
          { code: 'CRITERIA_OPEN_GLASS_VIEW', name: '개방시설우선', desc: '통유리 오픈형 안심 시술 공간', targetAttribute: 'facility: open_glass' },
          { code: 'CRITERIA_LARGE_BATH_BOOTH', name: '대형시설우선', desc: '대형견 전용 욕조 및 전동 리프트 테이블', targetAttribute: 'facility: large_bath' }
        ]
      }
    ]
  },
  {
    rootId: 'SERVICE_QUALITY',
    rootName: '2. 시술 품질 및 전문성 (Service Quality & Expertise)',
    description: '디자이너의 숙련도, 1:1 케어 환경, 수상 경력 등 퀄리티 기준',
    subNodes: [
      {
        subId: 'DESIGN_EXPERTISE',
        subName: '스타일링 전문성',
        criteriaList: [
          { code: 'CRITERIA_QUALITY_MASTER', name: '전문성우선', desc: '대회 수상 및 수석 디자이너 1:1 전담', targetAttribute: 'expertise: award_winner' },
          { code: 'CRITERIA_BREED_SPECIALTY', name: '견종특화우선', desc: '비숑/포메/푸들 가위컷 전문 시그니처', targetAttribute: 'specialty: scissor_cut' }
        ]
      },
      {
        subId: 'CARE_ENVIRONMENT',
        subName: '심리 및 안심 케어',
        criteriaList: [
          { code: 'CRITERIA_PRIVATE_SOLO', name: '1인케어우선', desc: '동시간대 다른 아이 없는 100% 독립 케어', targetAttribute: 'environment: solo_private' },
          { code: 'CRITERIA_STRESS_FREE', name: '스트레스최소우선', desc: '충분한 적응 시간 부여 및 간식 보상 케어', targetAttribute: 'policy: stress_free' }
        ]
      }
    ]
  },
  {
    rootId: 'SAFETY_WELLNESS',
    rootName: '3. 안전 및 건강 케어 (Safety & Wellness)',
    description: '노령견, 관절 질환, 피부 트러블 등 특수 건강 관리 기준',
    subNodes: [
      {
        subId: 'SENIOR_SAFETY',
        subName: '노령견 안전',
        criteriaList: [
          { code: 'CRITERIA_SAFETY_SENIOR', name: '노령견안전우선', desc: '2인 1조 보조, 무반동 푹신 매트, 심장/관절 주의', targetAttribute: 'safety: senior_assist' },
          { code: 'CRITERIA_EMERGENCY_LINK', name: '병원연계우선', desc: '인근 동물병원 응급 연계 시스템 구축', targetAttribute: 'safety: hospital_linked' }
        ]
      },
      {
        subId: 'SKIN_SPA',
        subName: '피부 및 웰니스',
        criteriaList: [
          { code: 'CRITERIA_SPA_CARBONATED', name: '스파케어우선', desc: '프리미엄 탄산스파, 머드팩, 각질 피부 진정', targetAttribute: 'care: spa_carbonated' },
          { code: 'CRITERIA_ORGANIC_SHAMPOO', name: '천연제품우선', desc: 'EWG 그린등급 천연 유기농 샴푸 전용 사용', targetAttribute: 'product: organic' }
        ]
      }
    ]
  },
  {
    rootId: 'ECONOMIC_TIME',
    rootName: '4. 경제성 및 시간 효율 (Economy & Time Efficiency)',
    description: '가격 가성비, 소요 시간, 예약 즉시성 등 효율성 기준',
    subNodes: [
      {
        subId: 'PRICE_VALUE',
        subName: '가격 경쟁력',
        criteriaList: [
          { code: 'CRITERIA_PRICE_VALUE', name: '가격우선', desc: '불필요한 거품을 뺀 합리적 정찰제 가성비', targetAttribute: 'price: value_tier' },
          { code: 'CRITERIA_REGULAR_PASS', name: '정기권혜택우선', desc: '다회권 및 월간 정기 관리 할인 제공', targetAttribute: 'price: membership_discount' }
        ]
      },
      {
        subId: 'TIME_EFFICIENCY',
        subName: '시간 및 속도',
        criteriaList: [
          { code: 'CRITERIA_QUICK_SERVICE', name: '빠른시술우선', desc: '손 빠른 디자이너의 60분 이내 신속 클리핑', targetAttribute: 'time: under_60min' },
          { code: 'CRITERIA_SAME_DAY_INSTANT', name: '당일예약우선', desc: '당일 빈 타임슬롯 즉시 접수 가능 매장', targetAttribute: 'time: same_day_instant' },
          { code: 'CRITERIA_NIGHT_WEEKEND', name: '야간/주말우선', desc: '평일 18시 이후 야간 및 일요일 운영 매장', targetAttribute: 'time: night_weekend' }
        ]
      }
    ]
  }
]

// ── 실제 매칭 시뮬레이션 매핑 테이블 (Criteria Matching Simulation Table) ──
const CRITERIA_MATCHING_CASES = [
  {
    criteriaCode: 'CRITERIA_PARKING_DEDICATED',
    criteriaName: '주차우선',
    rootCategory: '시설 및 접근성',
    targetShop: '뽀송펫 스파 (하단동 789-3)',
    reason: '지상 5대 전용 주차장 완비 매장 속성 매핑',
    service: '대형견 탄산스파 목욕',
    price: '90,000원'
  },
  {
    criteriaCode: 'CRITERIA_SAFETY_SENIOR',
    criteriaName: '노령견안전우선',
    rootCategory: '안전 및 건강 케어',
    targetShop: '해피퍼피 살롱 (하단동 456-2)',
    reason: '2인 1조 노령견 무반동 매트 시술 속성 매핑',
    service: '노령견 안심 스포팅',
    price: '60,000원'
  },
  {
    criteriaCode: 'CRITERIA_QUALITY_MASTER',
    criteriaName: '전문성우선',
    rootCategory: '시술 품질 및 전문성',
    targetShop: '프리미엄 독스타 (하단동 222-5)',
    reason: '전국대회 수상 수석 디자이너 1:1 시그니처 컷 속성 매핑',
    service: '시그니처 디자인 컷',
    price: '120,000원'
  },
  {
    criteriaCode: 'CRITERIA_PRICE_VALUE',
    criteriaName: '가격우선',
    rootCategory: '경제성 및 시간 효율',
    targetShop: '하단 댕댕쌀롱 (하단동 111-4)',
    reason: '하단동 최저가 30,000원 기본 클리핑 정찰제 속성 매핑',
    service: '기본 클리핑 (3mm)',
    price: '30,000원'
  },
  {
    criteriaCode: 'CRITERIA_PRIVATE_SOLO',
    criteriaName: '1인케어우선',
    rootCategory: '시술 품질 및 전문성',
    targetShop: '멍멍가위 하단점 (하단동 123-1)',
    reason: '동시간대 단 1마리 단독 룸 100% 집중 케어 속성 매핑',
    service: '전체 가위컷 (소형견)',
    price: '70,000원'
  }
]

export default async function RecommendationTaxonomyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 pb-32 space-y-8">
      {/* ── 상단 헤더 ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              ← 관리자 홈
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <Link href="/admin/high-value-profile-report" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              고급 프로파일
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-teal-700 font-bold">추천 기준 분류 체계(Taxonomy)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
            🌲 토보 추천 기준 분류 체계(Taxonomy Tree) 아키텍처 보고서
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            프롬프트의 감성적 텍스트가 아닌, <strong>&apos;주차우선&apos; · &apos;가격우선&apos; · &apos;전문성우선&apos; · &apos;편의시설우선&apos; 등 정형화된 트리 기준</strong>에 의해 결정론적으로 매칭되는 시스템 설계도
          </p>
        </div>
      </div>

      {/* ── 1. 핵심 아키텍처 개요 ── */}
      <div className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
          <span>System Architecture</span>
          <span>•</span>
          <span>Deterministic Recommendation Tree</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
          &quot;기준이 명확해야 시스템이 고도화되고, 기준이 확장될수록 독보적인 추천 경쟁력이 됩니다&quot;
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed max-w-4xl">
          토보는 줄글 설명으로 추천하지 않습니다. 백엔드 DB의 매장 속성과 고객이 선택한 맥락을 <strong>4대 대분류 15대 표준 추천 기준 코드(Criteria Code)</strong>로 정확히 인덱싱하여, 누구나 납득할 수 있는 명확한 기준 뱃지로 직결 매칭합니다.
        </p>
      </div>

      {/* ── 2. 추천 기준 트리 구조도 (4대 대분류 / 8개 중분류 / 15개 소분류 기준) ── */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
          추천 기준 계층형 분류 트리 구조도 (4대 Pillar / 15대 표준 기준)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RECOMMENDATION_TAXONOMY_TREE.map((root, rIdx) => (
            <div key={rIdx} className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                {/* 대분류 헤더 */}
                <div className="p-4 bg-gray-900 text-white border-b border-gray-800">
                  <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">
                    {root.rootId}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{root.rootName}</h3>
                  <p className="text-[11px] text-gray-300 mt-1">{root.description}</p>
                </div>

                {/* 중분류 & 소분류 트리 노드 */}
                <div className="p-5 space-y-5 divide-y divide-gray-100">
                  {root.subNodes.map((sub, sIdx) => (
                    <div key={sIdx} className={`space-y-2.5 ${sIdx > 0 ? 'pt-4' : ''}`}>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                        <span>{sub.subName}</span>
                      </div>

                      <div className="space-y-2 pl-3 border-l-2 border-gray-100">
                        {sub.criteriaList.map((crit, cIdx) => (
                          <div key={cIdx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {crit.name}
                              </span>
                              <code className="text-[10px] text-gray-400 font-mono">{crit.code}</code>
                            </div>
                            <p className="text-[11px] text-gray-600">{crit.desc}</p>
                            <div className="text-[10px] text-gray-400 font-mono">
                              DB 속성: {crit.targetAttribute}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. 기준 기반 추천 매핑 시뮬레이션 매트릭스 ── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-3">
          <span>🎯 추천 기준 코드 매핑 실증 시뮬레이션 매트릭스</span>
          <span className="text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full font-bold">
            결정론적 매칭 100%
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <th className="p-3">추천 기준 뱃지</th>
                <th className="p-3">기준 분류 (Category)</th>
                <th className="p-3">매핑된 1순위 매장</th>
                <th className="p-3">결정론적 매칭 근거 (DB 속성)</th>
                <th className="p-3">대표 서비스 & 가격</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {CRITERIA_MATCHING_CASES.map((cs, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition">
                  <td className="p-3">
                    <span className="font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      [{cs.criteriaName}]
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 font-medium">{cs.rootCategory}</td>
                  <td className="p-3 font-bold text-gray-900">{cs.targetShop}</td>
                  <td className="p-3 text-gray-600">{cs.reason}</td>
                  <td className="p-3 font-semibold text-gray-900">
                    {cs.service} <span className="text-teal-700">({cs.price})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
