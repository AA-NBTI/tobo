export interface HiddenNeedConfig {
  code: string;
  trigger_keywords: string[];
  suggestion_message: string;
  filter_condition: Record<string, any>;
}

export const HIDDEN_NEEDS_CATALOG: Record<string, HiddenNeedConfig> = {
  pickup: {
    code: 'pickup',
    trigger_keywords: ['다리', '관절', '무거워', '뚜벅이', '이동', '차량', '픽업', '수술 후'],
    suggestion_message: '이동이 불편하시군요! 편안하게 이동하실 수 있도록 픽업 서비스가 제공되는 곳들로 우선 찾아봤어요.',
    filter_condition: { is_pickup_available: true }
  },
  senior_care: {
    code: 'senior_care',
    trigger_keywords: ['노령', '나이가', '심장', '노견', '백내장', '조심'],
    suggestion_message: '나이가 있거나 지병이 있는 아이군요. 경험 많고 응급 대처가 가능한 시니어 케어 전문 매장으로 제안해 드릴게요.',
    filter_condition: { is_senior_care: true }
  },
  allergy_care: {
    code: 'allergy_care',
    trigger_keywords: ['알러지', '눈물', '피부', '간식', '예민'],
    suggestion_message: '식이 알러지나 피부가 예민한 아이를 위해 저알러지/천연 성분 케어가 가능한 곳들 위주로 알려드릴게요.',
    filter_condition: { is_allergy_care: true }
  }
};
