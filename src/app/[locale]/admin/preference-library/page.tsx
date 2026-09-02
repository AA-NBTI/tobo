import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// 실제 DB에 등록된 하단동 5대 애견미용 샵별 100% 매칭 시뮬레이션 데이터 세트
const PET_GROOMING_5_SIMULATIONS = [
  {
    shopName: '1. 멍멍가위 하단점',
    shopCategory: '가위컷 전문 / 1인 단독샵',
    targetCustomer: '말티즈·포메 등 가위컷 정밀 스타일링과 스트레스 프리 케어를 원하는 보호자',
    totalTurns: 4,
    profiledSlots: {
      location: '사하구 하단동',
      category: '애견미용',
      style: '전체 가위컷 & 위생 스타일링',
      target_detail: '소형견 (포메/말티즈 3.5kg)',
      vibe_mood: '1:1 단독 예약제, 스트레스 최소화',
      price_priority: '정밀 케어 적정가 (70,000원 선)',
      schedule_time: '주말 오후 (14:00)'
    },
    dialogueHistory: [
      {
        turn: 1,
        botQuestion: '안녕하세요! 하단동 주변에 어떤 케어가 필요하신가요?',
        cardTitle: '1차 서비스 프로그램 선택',
        options: ['전체 가위컷 & 스타일링', '프리미엄 탄산 스파 & 목욕', '기본 위생 클리핑', '노령견 안심 케어'],
        userChoice: '전체 가위컷 & 스타일링',
        reasoning: '가위컷 선호 고객 식별 -> 가위컷 전문점(멍멍가위, 프리미엄독스타) 후보군 압축'
      },
      {
        turn: 2,
        botQuestion: '아이의 품종과 체급을 알려주세요. 정밀 가위컷 소요시간과 전담 스타일리스트를 배정해 드려요.',
        cardTitle: '반려견 체급/견종 선택',
        options: ['소형견 (말티즈, 포메 ~5kg)', '중형견 (비숑, 코기 5~12kg)', '대형견 (골든 등 12kg~)', '특수견/쇼독'],
        userChoice: '소형견 (말티즈, 포메 ~5kg)',
        reasoning: '소형견 가위컷 슬롯 충족 -> 멍멍가위의 주력 서비스 [전체 가위컷(소형견)]과 직결'
      },
      {
        turn: 3,
        botQuestion: '매장을 선택하실 때 가장 중요하게 생각하시는 운영 스타일은 무엇인가요?',
        cardTitle: '매장 운영 성향 & 환경 선택',
        options: ['1:1 단독 스트레스 없는 케어', '쇼독 스타일 화려한 디자인', '노령견 안전 우선', '손 빠르고 가성비 좋은 곳'],
        userChoice: '1:1 단독 스트레스 없는 케어',
        reasoning: '스트레스 프리 성향 충족 -> 멍멍가위의 특장점(스트레스 없는 가위컷 전문) 100% 부합'
      },
      {
        turn: 4,
        botQuestion: '희망하시는 방문 시간대를 선택해 주시면 바로 예약을 연결해 드릴게요.',
        cardTitle: '방문 희망 일정',
        options: ['이번 주말 오후 (14:00~18:00)', '이번 주말 오전', '평일 오후'],
        userChoice: '이번 주말 오후 (14:00~18:00)',
        reasoning: '모든 7대 슬롯 완성 -> [멍멍가위 하단점] 예약 확정 카드 출력'
      }
    ],
    finalMatchingResult: {
      matchedShop: '멍멍가위 하단점',
      address: '부산 사하구 하단동 123-1',
      serviceName: '전체 가위컷 (소형견)',
      price: '70,000원 (120분)',
      matchReason: '하단동 + 소형견 전체 가위컷 + 1:1 스트레스 프리 1인 케어 조건 100% 일치'
    }
  },
  {
    shopName: '2. 해피퍼피 살롱',
    shopCategory: '노령견 전문 / 안심 안전 미용',
    targetCustomer: '나이가 많거나 관절/심장이 약해 서서 미용받기 힘든 노령견 보호자',
    totalTurns: 4,
    profiledSlots: {
      location: '사하구 하단동',
      category: '애견미용',
      style: '노령견 안심 스포팅 & 무리 없는 케어',
      target_detail: '시니어견 (11세 시츄, 관절 약함)',
      vibe_mood: '안전 최우선, 2인 1조 보조, 푹신한 매트',
      price_priority: '안전성 대비 합리적 가격 (60,000원)',
      schedule_time: '평일 낮 한적한 시간 (13:00)'
    },
    dialogueHistory: [
      {
        turn: 1,
        botQuestion: '하단동에서 찾으시는 반려견 미용의 가장 중요한 목적이 무엇인가요?',
        cardTitle: '케어 우선순위 선택',
        options: ['노령견/특수 케어 안심 미용', '가위컷 미용', '대형견 목욕스파', '기본 클리핑'],
        userChoice: '노령견/특수 케어 안심 미용',
        reasoning: '시니어/안전 케어 니즈 식별 -> 해피퍼피 살롱 1순위 타겟팅'
      },
      {
        turn: 2,
        botQuestion: '아이의 연령대와 건강 상태를 선택해 주세요.',
        cardTitle: '반려견 연령 & 컨디션',
        options: ['10세 이상 시니어 (관절/심장 주의)', '성견 (2~9세 건강함)', '1세 미만 퍼피 (첫 배냇미용)', '입질/예민견'],
        userChoice: '10세 이상 시니어 (관절/심장 주의)',
        reasoning: '시니어견 슬롯 확정'
      },
      {
        turn: 3,
        botQuestion: '선호하시는 시술 스타일과 매장 환경을 골라주세요.',
        cardTitle: '시술 환경 & 스타일',
        options: ['스트레스 최소화 안심 스포팅', '빠른 빡빡이 미용', '풍성한 가위컷'],
        userChoice: '스트레스 최소화 안심 스포팅',
        reasoning: '해피퍼피 살롱의 대표 서비스 [노령견 안심 스포팅] 매칭'
      },
      {
        turn: 4,
        botQuestion: '컨디션 조절을 위한 방문 시간대를 선택해 주세요.',
        cardTitle: '방문 시간대',
        options: ['평일 낮 한적한 시간 (13:00~16:00)', '주말 오전', '주말 오후'],
        userChoice: '평일 낮 한적한 시간 (13:00~16:00)',
        reasoning: '조용한 평일 시간대 슬롯 충족 -> [해피퍼피 살롱] 예약 카드 출력'
      }
    ],
    finalMatchingResult: {
      matchedShop: '해피퍼피 살롱',
      address: '부산 사하구 하단동 456-2',
      serviceName: '노령견 안심 스포팅',
      price: '60,000원 (90분)',
      matchReason: '하단동 + 10세 이상 노령견 안심 케어 + 평일 한적한 시간대 예약 조건 완벽 매칭'
    }
  },
  {
    shopName: '3. 뽀송펫 스파',
    shopCategory: '대형견 목욕 / 탄산스파 전문',
    targetCustomer: '집에서 목욕시키기 힘든 골든리트리버/사모예드 등 대형견 및 털갈이 피부 스파 희망 보호자',
    totalTurns: 4,
    profiledSlots: {
      location: '사하구 하단동',
      category: '애견미용/스파',
      style: '최고급 탄산스파 & 털갈이 데쉐딩',
      target_detail: '대형견 (골든리트리버 30kg)',
      vibe_mood: '대형견 전용 드라이룸/욕조 완비',
      price_priority: '전문 대형 시설 (90,000원)',
      schedule_time: '주말 오전 (10:00)'
    },
    dialogueHistory: [
      {
        turn: 1,
        botQuestion: '오늘 희망하시는 메인 서비스 종류를 선택해 주세요.',
        cardTitle: '서비스 종류',
        options: ['대형견 목욕 및 털갈이 스파', '가위컷 미용', '노령견 안심케어', '기본 클리핑'],
        userChoice: '대형견 목욕 및 털갈이 스파',
        reasoning: '대형견 스파 니즈 파악 -> 뽀송펫 스파 직결'
      },
      {
        turn: 2,
        botQuestion: '아이의 체급을 선택해 주세요.',
        cardTitle: '반려견 체급',
        options: ['대형견 (15kg~40kg)', '초대형견 (40kg 이상)', '중형견 (8~15kg)', '소형견'],
        userChoice: '대형견 (15kg~40kg)',
        reasoning: '대형견 슬롯 확정 -> 대형견 전용 부스 보유 매장 필터링'
      },
      {
        turn: 3,
        botQuestion: '추가로 집중 케어하고 싶은 피부/모질 고민이 있으신가요?',
        cardTitle: '스킨/스파 프로그램',
        options: ['피부 진정 탄산스파 & 죽은 털 제거', '단순 기본 목욕/드라이', '약용 샴푸 처방'],
        userChoice: '피부 진정 탄산스파 & 죽은 털 제거',
        reasoning: '뽀송펫 스파 대표 시그니처 메뉴와 100% 일치'
      },
      {
        turn: 4,
        botQuestion: '원활한 건조 시간을 확보할 수 있는 방문 일정을 골라주세요.',
        cardTitle: '방문 시간대',
        options: ['주말 오전 (10:00~12:00)', '주말 오후', '평일 오후'],
        userChoice: '주말 오전 (10:00~12:00)',
        reasoning: '주말 오전 대형견 슬롯 충족 -> [뽀송펫 스파] 예약 카드 출력'
      }
    ],
    finalMatchingResult: {
      matchedShop: '뽀송펫 스파',
      address: '부산 사하구 하단동 789-3',
      serviceName: '대형견 목욕 및 털갈이 관리',
      price: '90,000원 (150분)',
      matchReason: '하단동 + 대형견 전용 드라이 시설 + 프리미엄 탄산스파 및 죽은 털 관리 100% 매칭'
    }
  },
  {
    shopName: '4. 하단 댕댕쌀롱',
    shopCategory: '가성비 실속 / 빠른 기본 클리핑',
    targetCustomer: '위생 위주로 빠르게 3mm/5mm 클리핑 미용을 받고자 하는 실속파 보호자',
    totalTurns: 4,
    profiledSlots: {
      location: '사하구 하단동',
      category: '애견미용',
      style: '기본 클리핑 (3mm 전신)',
      target_detail: '소형/중형견 (믹스견 6kg)',
      vibe_mood: '빠른 미용 시간, 불필요한 거품 없는 실속 매장',
      price_priority: '최고 가성비 (30,000원)',
      schedule_time: '평일 당일 예약 즉시 방문'
    },
    dialogueHistory: [
      {
        turn: 1,
        botQuestion: '하단동에서 원하시는 미용 스타일의 핵심 기준을 골라주세요.',
        cardTitle: '미용 스타일 기준',
        options: ['가성비 좋고 빠른 기본 클리핑', '디자인 가위컷', '탄산 스파 목욕', '노령견 안심 미용'],
        userChoice: '가성비 좋고 빠른 기본 클리핑',
        reasoning: '가성비/클리핑 성향 파악 -> 하단 댕댕쌀롱 1순위 배정'
      },
      {
        turn: 2,
        botQuestion: '원하시는 클리핑 길이를 선택해 주세요.',
        cardTitle: '클리핑 길이 선택',
        options: ['전신 기본 3mm 깔끔 클리핑', '전신 5mm 스포팅', '얼굴컷 포함 클리핑'],
        userChoice: '전신 기본 3mm 깔끔 클리핑',
        reasoning: '하단 댕댕쌀롱의 30,000원 대표 시술 슬롯 완성'
      },
      {
        turn: 3,
        botQuestion: '보호자님의 매장 선택 우선순위는 무엇인가요?',
        cardTitle: '우선순위',
        options: ['부담 없는 가격 & 빠른 소요시간', '1:1 프라이빗 럭셔리', '통유리 오픈뷰'],
        userChoice: '부담 없는 가격 & 빠른 소요시간',
        reasoning: '하단 댕댕쌀롱 가치 제안과 일치'
      },
      {
        turn: 4,
        botQuestion: '방문 희망 일정을 골라주세요.',
        cardTitle: '방문 일정',
        options: ['당일 빠른 시간 (즉시 예약)', '이번 주말', '평일 저녁'],
        userChoice: '당일 빠른 시간 (즉시 예약)',
        reasoning: '당일 실속 슬롯 충족 -> [하단 댕댕쌀롱] 예약 카드 출력'
      }
    ],
    finalMatchingResult: {
      matchedShop: '하단 댕댕쌀롱',
      address: '부산 사하구 하단동 111-4',
      serviceName: '기본 클리핑 (3mm)',
      price: '30,000원 (60분)',
      matchReason: '하단동 + 최저가 가성비 클리핑 + 60분 이내 빠른 시술 조건 100% 일치'
    }
  },
  {
    shopName: '5. 프리미엄 독스타',
    shopCategory: '쇼독 스타일링 / 하이엔드 특수견 미용',
    targetCustomer: '비숑 프리제 쇼독 스타일링, 푸들 테디베어컷 등 고난도 시그니처 컷을 원하는 하이엔드 고객',
    totalTurns: 4,
    profiledSlots: {
      location: '사하구 하단동',
      category: '애견미용',
      style: '시그니처 하이엔드 디자인 컷',
      target_detail: '비숑 프리제 (하이바 컷 희망)',
      vibe_mood: '전국 대회 수상 수석 디자이너 1:1 전담, 최고급 케어',
      price_priority: '최고급 퀄리티 우선 (120,000원)',
      schedule_time: '주말 1인 집중 타임 (15:00)'
    },
    dialogueHistory: [
      {
        turn: 1,
        botQuestion: '어떤 레벨의 미용 서비스를 찾고 계신가요?',
        cardTitle: '미용 퀄리티 레벨',
        options: ['쇼독/대회급 시그니처 디자인 컷', '일반 가위컷', '기본 클리핑', '스파 목욕'],
        userChoice: '쇼독/대회급 시그니처 디자인 컷',
        reasoning: '하이엔드 니즈 파악 -> 프리미엄 독스타 직결'
      },
      {
        turn: 2,
        botQuestion: '아이의 품종과 희망하시는 시그니처 라인을 골라주세요.',
        cardTitle: '시그니처 디자인 라인',
        options: ['비숑 프리제 (대형 하이바/귀툭튀 컷)', '푸들 (테디베어/브로콜리 컷)', '포메라니안 (물개/곰돌이 컷)', '특수견 스타일링'],
        userChoice: '비숑 프리제 (대형 하이바/귀툭튀 컷)',
        reasoning: '고난도 비숑 디자인컷 슬롯 완성'
      },
      {
        turn: 3,
        botQuestion: '보호자님의 케어 철학과 가장 맞는 기준은 무엇인가요?',
        cardTitle: '케어 철학',
        options: ['수석 디자이너 전담 최고급 스타일링', '적당한 가격대', '빠른 미용'],
        userChoice: '수석 디자이너 전담 최고급 스타일링',
        reasoning: '프리미엄 독스타의 120,000원 대표 시술 슬롯 완성'
      },
      {
        turn: 4,
        botQuestion: '1:1 집중 스타일링을 위한 예약 일정을 선택해 주세요.',
        cardTitle: '예약 일정',
        options: ['주말 1인 전담 집중 타임 (15:00)', '주말 오전', '평일 오후'],
        userChoice: '주말 1인 전담 집중 타임 (15:00)',
        reasoning: '모든 7대 슬롯 완성 -> [프리미엄 독스타] 예약 카드 출력'
      }
    ],
    finalMatchingResult: {
      matchedShop: '프리미엄 독스타',
      address: '부산 사하구 하단동 222-5',
      serviceName: '시그니처 디자인 컷',
      price: '120,000원 (180분)',
      matchReason: '하단동 + 비숑 하이바 시그니처 컷 + 수석 디자이너 1:1 전담 최고급 퀄리티 조건 100% 매칭'
    }
  }
]

export default async function PreferenceLibraryPage() {
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
            <span className="text-xs text-purple-600 font-bold">5대 매장 시뮬레이션 전수 보고서</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
            📊 하단동 애견미용 5개 매장별 질문-카드-슬롯-예약 전수 시뮬레이션 보고서
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            등록된 5개 매장의 실제 서비스와 특성에 맞춰, <strong>어떤 질문과 카드가 오가며 어떻게 7개 슬롯이 채워져 최종 예약으로 연결되는지</strong> 한눈에 검토하는 전수 데이터베이스
          </p>
        </div>
      </div>

      {/* ── 1. 5개 매장 한눈에 보기 요약 매트릭스 ── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          하단동 5대 애견미용 샵 타겟팅 매트릭스 (Targeting & Slot Matrix)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PET_GROOMING_5_SIMULATIONS.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                  매장 {idx + 1}
                </span>
                <div className="font-bold text-xs text-gray-900 mt-1.5">{item.shopName}</div>
                <div className="text-[11px] text-gray-500 font-medium">{item.shopCategory}</div>
              </div>
              <div className="pt-2 border-t border-gray-200/60 text-[11px] text-purple-900 font-semibold">
                대표 메뉴: {item.finalMatchingResult.serviceName} ({item.finalMatchingResult.price})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. 매장별 1:1 시뮬레이션 상세 시나리오 (5개 전수 출력) ── */}
      <div className="space-y-8">
        <h2 className="text-lg font-bold text-gray-900">
          🔍 5개 매장별 질문-답변-카드제공-슬롯채움-예약연결 시뮬레이션 전수 검토
        </h2>

        {PET_GROOMING_5_SIMULATIONS.map((sim, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* 시나리오 상단 배너 */}
            <div className="p-5 bg-[#0f172a] text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
                    시뮬레이션 #{idx + 1}
                  </span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-300 font-medium">{sim.shopCategory}</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">{sim.shopName} 매칭 시나리오</h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  <strong>[타겟 유저]:</strong> {sim.targetCustomer}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-semibold text-gray-200">
                  총 {sim.totalTurns}턴 질문·카드 완료
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-lg text-xs font-semibold">
                  7대 취향 슬롯 100% 수집
                </span>
              </div>
            </div>

            {/* 수집된 7대 슬롯 프로필 요약 뱃지 */}
            <div className="px-6 py-3 bg-purple-50/50 border-b border-purple-100 flex flex-wrap gap-2 text-xs">
              <span className="font-bold text-purple-900">수집된 취향 슬롯:</span>
              <span className="bg-white px-2 py-0.5 rounded border border-purple-200 text-gray-700">📍 {sim.profiledSlots.location}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-purple-200 text-gray-700">✂️ {sim.profiledSlots.style}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-purple-200 text-gray-700">🐕 {sim.profiledSlots.target_detail}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-purple-200 text-gray-700">🌿 {sim.profiledSlots.vibe_mood}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-purple-200 text-gray-700">💰 {sim.profiledSlots.price_priority}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-purple-200 text-gray-700">⏰ {sim.profiledSlots.schedule_time}</span>
            </div>

            {/* 단계별 대화 및 카드 렌더링 과정 */}
            <div className="p-6 space-y-6">
              {sim.dialogueHistory.map((d, dIdx) => (
                <div key={dIdx} className="flex gap-4 border-b border-gray-100 pb-5 last:border-b-0 last:pb-0">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 flex items-center justify-center font-bold text-xs shrink-0">
                    Q{d.turn}
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="text-xs font-bold text-gray-900">
                        <span className="text-purple-700 font-bold mr-1.5">[토보의 질문]:</span>
                        {d.botQuestion}
                      </div>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded self-start sm:self-auto">
                        추론 근거: {d.reasoning}
                      </span>
                    </div>

                    {/* 카드 UI 시뮬레이션 박스 */}
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <div className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                        제시된 선택 카드: {d.cardTitle}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5">
                        {d.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`px-3 py-2 text-xs rounded-xl border transition ${
                              opt === d.userChoice
                                ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200'
                            }`}
                          >
                            <div className="truncate">{opt}</div>
                            {opt === d.userChoice && (
                              <div className="text-[10px] text-purple-200 mt-0.5">✓ 유저 탭(선택됨)</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 최종 예약 확정 카드 시뮬레이션 */}
              <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-700 text-white rounded text-[10px] font-bold">최종 매칭 완료</span>
                    <span className="text-base font-black text-gray-900">{sim.finalMatchingResult.matchedShop}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    📍 {sim.finalMatchingResult.address} | 대표 시술: <strong>{sim.finalMatchingResult.serviceName}</strong> ({sim.finalMatchingResult.price})
                  </div>
                  <div className="text-xs text-purple-800 font-medium pt-1">
                    ✨ <strong>매칭 근거:</strong> {sim.finalMatchingResult.matchReason}
                  </div>
                </div>
                <button className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0">
                  실시간 예약하기 →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
