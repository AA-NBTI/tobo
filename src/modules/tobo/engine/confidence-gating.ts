/**
 * 🔒 [Core 4] 신뢰도 기반 확인 절차 (Confidence Gating Engine)
 * - 신뢰도(Confidence)와 추출된 슬롯 완성도를 엄격한 AND 조건으로 판정
 * - DIRECT_PROCEED: 확신도 90% 이상 'AND' 유효 슬롯 2개 이상 충족 시에만 초고속 직진 허용
 */

export type ConfidenceBranchType = 'DIRECT_PROCEED' | 'CONFIRMATION_CHECK' | 'REQUERY_FALLBACK';

export interface ConfidenceDecision {
  branch: ConfidenceBranchType;
  confidenceScore: number;
  confirmationPrompt?: string;
}

export function evaluateConfidenceBranch(
  extractedSlotsCount: number,
  avgConfidence: number,
  turnStep: number
): ConfidenceDecision {
  // [수정 완료: AND 조건 강제]
  // 확신도가 90% 이상 '이면서' 추출된 유효 슬롯이 최소 2개 이상일 때만 초고속 직진
  if (avgConfidence >= 0.90 && extractedSlotsCount >= 2) {
    return {
      branch: 'DIRECT_PROCEED',
      confidenceScore: Math.round(avgConfidence * 100) || 95
    };
  }

  // 확신도가 60~90% 사이이거나, 슬롯이 1개라도 추출된 경우 ➔ 가벼운 1회 확인 절차
  if (avgConfidence >= 0.60 || extractedSlotsCount >= 1 || turnStep >= 2) {
    return {
      branch: 'CONFIRMATION_CHECK',
      confidenceScore: Math.round(avgConfidence * 100) || 75,
      confirmationPrompt: '말씀해 주신 조건이 맞으신지 가볍게 확인 후 진행해 드릴까요?'
    };
  }

  // 확신도 60% 미만 ➔ 안전하게 명확한 선택 카드로 되물음 (환각 방지)
  return {
    branch: 'REQUERY_FALLBACK',
    confidenceScore: Math.round(avgConfidence * 100) || 45,
    confirmationPrompt: '정확한 안내를 위해, 원하시는 항목을 아래 카드에서 선택해 주시겠어요?'
  };
}
