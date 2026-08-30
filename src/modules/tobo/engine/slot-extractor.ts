import { generateEnforcedAIContent } from '../../../utils/ai-core';

import { getLearnedMappingsFromDb, upsertLearnedKnowledge } from './knowledge-engine';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ExtractedSlots {
  category: 'pet_grooming' | 'clinic' | 'pet_hotel' | 'pet_dining' | 'pet_pension' | 'UNSUPPORTED' | null;
  unsupported_category_raw: string | null;
  target_date: string | null;
  target_time: string | null;
  party_size: number | null;
  region_hint: string | null;
  force_reshow: boolean;
}

export interface ExtractedIntent {
  slots: ExtractedSlots;
  conversation_type: 'SERVICE_REQUEST' | 'OFF_TOPIC';
  detected_hidden_needs?: string[];
  learned_mappings?: Array<{ raw_expression: string; normalized_value: string; field_id: string; }>;
}

const SLOT_EXTRACTION_PROMPT = `당신은 부산 사하구 하단 지역 맞춤 로컬 예약 컨시어지의 필수 조건 추출 및 대화 의도 분석기입니다.
주어진 대화 기록(전체)을 처음부터 끝까지 읽고, 가장 최신 정보를 바탕으로 고객의 의도와 예약 조건을 아래 JSON 스키마로만 출력하세요.

## 분류 규칙
- conversation_type: 
  - "SERVICE_REQUEST": 로컬 매장/서비스를 찾거나 문의하는 모든 발화. 업종을 명시하지 않고 "어떤 매장 있어?", "추천해줘" 같은 포괄적 질문도 여기 포함됩니다.
  - "OFF_TOPIC": 서비스와 무관한 인사, 잡담, 감사 표현 등.

## 필수 추출 슬롯 (slots)
- category: 업종. 지원 업종 5개('pet_grooming', 'clinic', 'pet_hotel', 'pet_dining', 'pet_pension') 중 하나이거나, 전혀 다른 미지원 서비스(항공권, 대리기사 등)를 찾을 경우 "UNSUPPORTED", 모르면 null.
  - pet_grooming: 반려견 미용, 목욕, 스파
  - clinic: 동물병원, 예방접종, 중성화, 수술
  - pet_hotel: 애견호텔, 유치원, 돌봄
  - pet_dining: 애견동반 식당, 카페
  - pet_pension: 애견동반 펜션, 숙박
- unsupported_category_raw: category가 "UNSUPPORTED"일 경우, 고객이 실제로 말한 서비스 명칭(예: "대리기사"). 아닐 경우 null.
- target_date: 방문할 날짜 (예: "오늘", "내일", "11월 22일"). 모르면 null
- target_time: 방문할 시간 (예: "14:00", "오후 2시"). 모르면 null
- party_size: 방문할 인원 수 (숫자, 예: 2). 모르면 null
- region_hint: 희망 지역 힌트 (예: "하단역"). 모르면 null
- force_reshow: 고객이 명시적으로 "선택지 다시 보여줘", "카드 어딨어?" 등 이전에 뜬 화면(카드)을 다시 보고 싶어하는 경우 true, 아니면 false.

## 텍스트 버튼 강제 매핑 규칙 (매우 중요)
프론트엔드에서 카드 버튼 클릭 시 텍스트로만 전달되므로, 사용자의 입력이 아래와 일치할 경우 **반드시** 지정된 슬롯 값으로 추출하세요.
[업종 버튼]
- "✂️ 강아지 미용 / 목욕" ➔ category: "pet_grooming"
- "🏥 동물병원 / 진료" ➔ category: "clinic"
- "🏨 애견호텔 / 유치원" ➔ category: "pet_hotel"
- "🍽️ 애견동반 식당 / 카페" ➔ category: "pet_dining"
- "🏕️ 애견동반 펜션 / 풀빌라" ➔ category: "pet_pension"
- "💡 다른 서비스 찾기" ➔ category: "UNSUPPORTED"

[지역 버튼]
- "📍 하단역 주변 (역세권)" ➔ region_hint: "하단역"
- "📍 동아대 승학캠퍼스 주변" ➔ region_hint: "동아대"
- "📍 하단 아트몰링 주변" ➔ region_hint: "아트몰링"
- "📍 사하구 전체 검색" ➔ region_hint: "사하구"

## Few-shot 예시

입력: "하단역 근처에 어떤 매장 있어?"
출력: {
  "slots": {"category": null, "target_date": null, "target_time": null, "party_size": null, "region_hint": "하단역"},
  "conversation_type": "SERVICE_REQUEST"
}

입력: "안녕하세요"
출력: {
  "slots": {"category": null, "target_date": null, "target_time": null, "party_size": null, "region_hint": null},
  "conversation_type": "OFF_TOPIC"
}

입력: "내일 2시에 애견동반 식당 예약할게요"
출력: {
  "slots": {"category": "pet_dining", "target_date": "내일", "target_time": "14:00", "party_size": null, "region_hint": null, "force_reshow": false},
  "conversation_type": "SERVICE_REQUEST"
}

입력: "거기 주차 되나요?" (진행 중인 예약 대화)
출력: {
  "slots": {"category": "pet_dining", "target_date": "내일", "target_time": "14:00", "party_size": null, "region_hint": null, "force_reshow": false},
  "conversation_type": "SERVICE_REQUEST"
}

입력: "대리기사도 예약돼요?"
출력: {
  "slots": {"category": "UNSUPPORTED", "unsupported_category_raw": "대리기사", "target_date": null, "target_time": null, "party_size": null, "region_hint": null, "force_reshow": false},
  "conversation_type": "SERVICE_REQUEST"
}

입력: "카드가 안 보이는데 다시 보여줄래?"
출력: {
  "slots": {"category": null, "unsupported_category_raw": null, "target_date": null, "target_time": null, "party_size": null, "region_hint": null, "force_reshow": true},
  "conversation_type": "SERVICE_REQUEST"
}

[변심 및 정정 처리 규칙]
고객이 방금 말한 정보("아 생각해보니 2시")는 이전 슬롯 값을 완전히 덮어씁니다.

[학습 지식 (learned_mappings) 규칙]
고객이 명백한 축약어, 오타, 비문(예: "낼" -> "내일", "3시데" -> "3시", "강남역 스벅" -> "강남역 스타벅스")을 사용하여 슬롯을 도출한 경우, 
앞으로 시스템이 이 표현을 학습할 수 있도록 learned_mappings 배열에 추가하세요.

[숨은 니즈(능동 제안) 규칙]
고객의 발화에서 다음과 같은 숨은 니즈 키워드가 감지되면 detected_hidden_needs 배열에 담아주세요. 없으면 빈 배열 []을 출력하세요.
- "pickup": 다리 불편, 뚜벅이, 차량 필요 등
- "senior_care": 노령견, 나이가 많음, 심장 등 지병
- "allergy_care": 눈물, 피부 예민, 알러지 등

반드시 아래 JSON 포맷으로만 응답하세요. 백틱(\`\`\`)이나 다른 설명은 절대 넣지 마세요.
{
  "slots": {
    "category": "...",
    "unsupported_category_raw": "...",
    "target_date": "...",
    "target_time": "...",
    "party_size": ...,
    "region_hint": "...",
    "force_reshow": ...
  },
  "conversation_type": "SERVICE_REQUEST",
  "detected_hidden_needs": ["pickup"],
  "learned_mappings": [
    { "raw_expression": "낼", "normalized_value": "내일", "field_id": "target_date" }
  ]
}`;

export async function extractSlots(message: string, history: any[], supabaseAdmin: SupabaseClient): Promise<ExtractedIntent> {
  // 1. 기존 학습된 매핑 조회
  let dbMappingsStr = "";
  try {
    const mappings = await getLearnedMappingsFromDb(supabaseAdmin, 'universal');
    if (mappings && mappings.length > 0) {
      dbMappingsStr = "\n[과거 학습된 매핑 참고자료 (DB)]\n" + mappings.map(m => `- "${m.raw_expression}" -> "${m.normalized_value}" (필드: ${m.field_id})`).join('\n');
    }
  } catch (e) {
    console.warn("getLearnedMappingsFromDb failed", e);
  }

  const formattedHistory = (history || [])
    .map((h: any) => `${h.role === 'user' ? '사용자' : '토보'}: ${h.content}`)
    .join('\n');
    
  const prompt = `${SLOT_EXTRACTION_PROMPT}
${dbMappingsStr}
  
[대화 기록]
${formattedHistory}
사용자: "${message}"
  
최종 분석 JSON:`;

  console.log("\n[🤖 extractSlots에 실제 전달된 시스템 프롬프트 전문]");
  console.log("==================================================");
  console.log(prompt);
  console.log("==================================================\n");

  try {
    const raw = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
    const jsonStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    // 2. 새로 발견된 학습 매핑(오타, 축약어) DB 저장
    if (parsed.learned_mappings && Array.isArray(parsed.learned_mappings)) {
      for (const mapping of parsed.learned_mappings) {
        if (mapping.raw_expression && mapping.normalized_value && mapping.field_id) {
          await upsertLearnedKnowledge(
            supabaseAdmin,
            mapping.raw_expression,
            mapping.normalized_value,
            mapping.field_id,
            'universal'
          );
          console.log(`[지식 학습 완료] ${mapping.raw_expression} -> ${mapping.normalized_value} (${mapping.field_id})`);
        }
      }
    }
    
    const validCategories = ['pet_grooming', 'clinic', 'pet_hotel', 'pet_dining', 'pet_pension', 'UNSUPPORTED'];
    let extractedCategory = parsed.slots?.category || null;
    if (extractedCategory && !validCategories.includes(extractedCategory)) {
      console.warn(`[스키마 위반 차단] 허용되지 않은 카테고리: ${extractedCategory}`);
      extractedCategory = null;
    }
    
    return {
      slots: {
        category: extractedCategory,
        unsupported_category_raw: parsed.slots?.unsupported_category_raw || null,
        target_date: parsed.slots?.target_date || null,
        target_time: parsed.slots?.target_time || null,
        party_size: typeof parsed.slots?.party_size === 'number' ? parsed.slots?.party_size : null,
        region_hint: parsed.slots?.region_hint || null,
        force_reshow: !!parsed.slots?.force_reshow,
      },
      conversation_type: parsed.conversation_type === 'OFF_TOPIC' ? 'OFF_TOPIC' : 'SERVICE_REQUEST',
      detected_hidden_needs: parsed.detected_hidden_needs || [],
    };
  } catch (e) {
    console.error("Slot Extraction Failed:", e);
    // Fallback
    return {
      slots: { category: null, unsupported_category_raw: null, target_date: null, target_time: null, party_size: null, region_hint: null, force_reshow: false },
      conversation_type: 'OFF_TOPIC',
      detected_hidden_needs: []
    };
  }
}
