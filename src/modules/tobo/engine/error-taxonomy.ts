/**
 * 🏷️ [Core 3] 5대 오류 유형 분류 체계 (Error Taxonomy Engine)
 * 시뮬레이션 실패 사례를 정밀 태깅하여 '어디를 고쳐야 하는지' 즉각 판정
 */

export type ErrorTaxonomyType = 
  | 'NONE'                  // 정상 완결
  | 'MISSING_SLOT'          // 1. 추출 누락 (손님이 말했는데 못 챙김)
  | 'HALLUCINATION'         // 2. 환각 (존재하지 않는 허위 매장/정보)
  | 'MISMATCH'              // 3. 오매칭 (슬롯은 맞는데 엉뚱한 매장 추천)
  | 'OVER_VERIFICATION'     // 4. 과잉 확인 (이미 아는 걸 또 물어봄)
  | 'LATENCY_INEFFICIENCY'; // 5. 응답 지연 및 비효율 (과도한 턴 수)

export interface ErrorClassificationResult {
  errorType: ErrorTaxonomyType;
  penaltyScore: number;
  rootCause: string;
  recommendedAction: string;
}

export function classifySimulationError(
  missedSlotsCount: number,
  duplicateQuestionCount: number,
  isHallucinated: boolean,
  isShopMatchedProperly: boolean,
  turnCount: number
): ErrorClassificationResult {
  // 1. 환각 발생 시 최우선 처벌
  if (isHallucinated) {
    return {
      errorType: 'HALLUCINATION',
      penaltyScore: -50,
      rootCause: 'DB에 실존하지 않는 허위 매장이나 스펙을 날조함',
      recommendedAction: '매장 조회 Tool 강제 바인딩 룰 재점검'
    };
  }

  // 2. 오매칭 발생 시
  if (!isShopMatchedProperly) {
    return {
      errorType: 'MISMATCH',
      penaltyScore: -30,
      rootCause: '고객의 핵심 취향(노령견/예산 등)과 1순위 추천 매장의 설비가 불일치함',
      recommendedAction: '매칭 스코어링 모델(matching-scorer.ts) 가중치 파라미터 튜닝'
    };
  }

  // 3. 과잉 확인 (중복 질문) 발생 시
  if (duplicateQuestionCount > 0) {
    return {
      errorType: 'OVER_VERIFICATION',
      penaltyScore: -20,
      rootCause: '이전 턴에서 이미 획득한 슬롯을 망각하고 또 질문함',
      recommendedAction: '슬롯 결핍도 분석기(slot-deficiency-engine) 상태 추적 메모리 보강'
    };
  }

  // 4. 추출 누락 발생 시
  if (missedSlotsCount > 6) {
    return {
      errorType: 'MISSING_SLOT',
      penaltyScore: -15,
      rootCause: '10턴 대화 동안 고객의 핵심 슬롯을 충분히 캐내지 못함',
      recommendedAction: '학습 지식 매핑 테이블(learned_mappings)에 신규 표현 패턴 등록'
    };
  }

  // 5. 비효율 발생 시
  if (turnCount > 10) {
    return {
      errorType: 'LATENCY_INEFFICIENCY',
      penaltyScore: -10,
      rootCause: '예약 체결까지 과도한 턴 수 소모',
      recommendedAction: '복합 질문 카드 우선순위 상향 조정'
    };
  }

  return {
    errorType: 'NONE',
    penaltyScore: 0,
    rootCause: '오류 없음. 전 항목 정상 완결.',
    recommendedAction: '현재 매칭 및 지식 모델을 골든 룰로 유지'
  };
}
