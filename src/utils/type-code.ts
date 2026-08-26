/**
 * Layer 1 — 정체성 축 (Trait Axes) 유틸리티
 *
 * 판단축 4개(target, affection, mask, pace) 연속값을 양자화해
 * type_code를 생성한다. 표현축(tone_temp, vocab)은 type_code에
 * 반영하지 않고 프롬프트 조각으로 직접 삽입한다(Phase 4에서 처리).
 *
 * 양자화 규칙:
 *   0~3  → 1 (low)
 *   4~6  → 2 (mid)
 *   7~10 → 3 (high)
 *
 * type_code 형식: T{1-3}A{1-3}M{1-3}P{1-3}
 *   T = target    (공격 대상)
 *   A = affection (애정 여부)
 *   M = mask      (표정/태도)
 *   P = pace      (반응 속도감)
 *
 * 예: target=3, affection=7, mask=5, pace=9 → "T1A3M2P3"
 */

// AxisProfile — 6개 축 연속값
export interface AxisProfile {
  target:    number;  // 판단축: 공격 대상       (0~10)
  affection: number;  // 판단축: 애정 여부        (0~10)
  mask:      number;  // 판단축: 표정/태도        (0~10)
  pace:      number;  // 판단축: 반응 속도감      (0~10)
  tone_temp: number;  // 표현축: 말투 온도        (0~10)
  vocab:     number;  // 표현축: 어휘 스타일      (0~10)
}

// 기존 advanced_settings 키 매핑 (하위 호환)
export interface LegacyAxisSettings {
  axisTarget?:    number;
  axisAffection?: number;
  axisAttitude?:  number;  // 현재 코드의 mask 역할
  axisPace?:      number;  // 신규 (Phase 1에서 추가)
  axisTone?:      number;  // tone_temp
  axisVocab?:     number;  // vocab
}

/**
 * 단일 축 값(0~10)을 3구간으로 양자화한다.
 * @returns 1(low) | 2(mid) | 3(high)
 */
export function quantizeAxis(value: number): 1 | 2 | 3 {
  const clamped = Math.max(0, Math.min(10, Math.round(value)));
  if (clamped <= 3) return 1;
  if (clamped <= 6) return 2;
  return 3;
}

/**
 * 구간 코드(1~3)를 레이블로 변환한다.
 */
export function quantizeLabelKo(q: 1 | 2 | 3): string {
  if (q === 1) return '저(Low)';
  if (q === 2) return '중(Mid)';
  return '고(High)';
}

/**
 * AxisProfile → type_code 생성
 * 판단축 4개만 반영, 표현축 2개는 무시.
 */
export function generateTypeCode(profile: Pick<AxisProfile, 'target' | 'affection' | 'mask' | 'pace'>): string {
  const t = quantizeAxis(profile.target);
  const a = quantizeAxis(profile.affection);
  const m = quantizeAxis(profile.mask);
  const p = quantizeAxis(profile.pace);
  return `T${t}A${a}M${m}P${p}`;
}

/**
 * 기존 advanced_settings (axisXxx 형식) + axisPace(신규)를
 * 표준 AxisProfile로 변환한다.
 */
export function legacyToAxisProfile(legacy: LegacyAxisSettings): AxisProfile {
  return {
    target:    legacy.axisTarget    ?? 5,
    affection: legacy.axisAffection ?? 5,
    mask:      legacy.axisAttitude  ?? 5,  // axisAttitude → mask
    pace:      legacy.axisPace      ?? 5,  // 신규 축
    tone_temp: legacy.axisTone      ?? 5,
    vocab:     legacy.axisVocab     ?? 5,
  };
}

/**
 * type_code → 판단축 구간 객체로 파싱
 * 예: "T2A3M1P3" → { target: 2, affection: 3, mask: 1, pace: 3 }
 */
export function parseTypeCode(typeCode: string): { target: number; affection: number; mask: number; pace: number } | null {
  const match = typeCode.match(/^T([123])A([123])M([123])P([123])$/);
  if (!match) return null;
  return {
    target:    parseInt(match[1]),
    affection: parseInt(match[2]),
    mask:      parseInt(match[3]),
    pace:      parseInt(match[4]),
  };
}

/**
 * 두 type_code 간의 Manhattan 거리 계산 (유사봇 검색용)
 * 최솟값 0 (동일), 최댓값 8 (완전 반대)
 */
export function typeCodeDistance(a: string, b: string): number {
  const pa = parseTypeCode(a);
  const pb = parseTypeCode(b);
  if (!pa || !pb) return Infinity;
  return (
    Math.abs(pa.target    - pb.target)    +
    Math.abs(pa.affection - pb.affection) +
    Math.abs(pa.mask      - pb.mask)      +
    Math.abs(pa.pace      - pb.pace)
  );
}

// ──────────────────────────────────────────────
// Phase 1 (1-4, 1-5): 사고단계 매핑 & 주도축(Dominant Axis) 계산
// ──────────────────────────────────────────────
export const STAGE_ROLES: Record<string, { role: string; label: string; desc: string }> = {
  target:    { role: 'attention',      label: '주의 (Attention)',      desc: '뭐가 먼저 눈에 들어오는가' },
  affection: { role: 'interpretation', label: '해석 (Interpretation)', desc: '눈에 들어온 걸 뭘 기준으로 푸는가' },
  mask:      { role: 'attribution',    label: '귀결 (Attribution)',    desc: '그 해석을 어떤 태도로 정리하는가' },
  pace:      { role: 'expression',     label: '표현 (Expression)',     desc: '언제·어떤 세기로 꺼내는가' },
}

export type DecisionAxisKey = 'target' | 'affection' | 'mask' | 'pace';

/**
 * 주도축(Dominant Axis) 계산 함수
 * 주도축 = argmax(|axis_score - 5|)  (판단축 4개 중)
 * 5와의 거리 차가 가장 먼 축이 이 봇의 1순위 사고축이 됨.
 */
export function calculateDominantAxis(profile: Pick<AxisProfile, 'target' | 'affection' | 'mask' | 'pace'>): {
  axis_key: DecisionAxisKey;
  label: string;
  stage_role: string;
  distance: number;
} {
  const axes: DecisionAxisKey[] = ['target', 'affection', 'mask', 'pace'];
  let dominant: DecisionAxisKey = 'target';
  let maxDist = -1;

  for (const axis of axes) {
    const val = profile[axis] ?? 5;
    const dist = Math.abs(val - 5);
    if (dist > maxDist) {
      maxDist = dist;
      dominant = axis;
    }
  }

  const info = STAGE_ROLES[dominant];
  const axisLabels: Record<DecisionAxisKey, string> = {
    target: '공격 대상 (Target)',
    affection: '애정 여부 (Affection)',
    mask: '표정/태도 (Mask)',
    pace: '반응 속도감 (Pace)',
  };

  return {
    axis_key: dominant,
    label: axisLabels[dominant],
    stage_role: info.role,
    distance: maxDist,
  };
}

/**
 * AxisProfile에서 직접 type_code + 주도축 + axis_profile JSONB를 생성해
 * DB 저장용 객체를 반환한다.
 */
export function buildAxisDbFields(profile: AxisProfile): {
  axis_profile: AxisProfile;
  type_code: string;
  dominant_axis: ReturnType<typeof calculateDominantAxis>;
} {
  return {
    axis_profile: profile,
    type_code: generateTypeCode(profile),
    dominant_axis: calculateDominantAxis(profile),
  };
}

// ──────────────────────────────────────────────
// Phase 3 (Layer 6): 노출 범위 (Visibility Scope) 필터링
// ──────────────────────────────────────────────
/**
 * 공개용 봇 프로필 DTO 변환 함수
 * 판단축 원본 수치(axis_profile)는 always_private 대상이므로 서버 응답에서
 * 완전 제거하고, 공개용 type_code 및 서사 문구 표현으로만 변환하여 반환한다.
 */
export function sanitizePublicBotProfile<T extends Record<string, any>>(bot: T): Omit<T, 'axis_profile' | 'persona_prompt'> & {
  type_code?: string;
  public_personality_summary?: string;
} {
  const { axis_profile, persona_prompt, ...publicData } = bot;

  let summary = '';
  if (axis_profile) {
    const profile = axis_profile as AxisProfile;
    const dominant = calculateDominantAxis(profile);
    const dominantLabels: Record<DecisionAxisKey, string> = {
      target: profile.target >= 7 ? '직설적인 인물 조명 스타일' : '사안의 구조 중심 탐구 스타일',
      affection: profile.affection >= 7 ? '뜨거운 공감과 애착 표현' : '건조하고 시니컬한 관점',
      mask: profile.mask >= 7 ? '은근히 뼈 때리는 유머 감각' : '단도직입적이고 명확한 스타일',
      pace: profile.pace >= 7 ? '즉각적이고 활발한 반응' : '신중하고 침착한 템포',
    };
    summary = dominantLabels[dominant.axis_key] || '';
  }

  return {
    ...publicData,
    public_personality_summary: summary,
  };
}

// ──────────────────────────────────────────────
// Phase 5 (Layer 4): 조종 세션 (Control Layer) 뱃지 렌더링 유틸리티
// ──────────────────────────────────────────────
export interface ControlSessionInfo {
  controller_type: 'autonomous' | 'boarded';
  human_handle?: string;
  is_human_public?: boolean;
}

export function getControlSessionBadge(session?: ControlSessionInfo | null): {
  icon: string;
  label: string;
  fullBadgeText: string;
} {
  if (!session || session.controller_type === 'autonomous') {
    return {
      icon: '🤖',
      label: '자율 운항',
      fullBadgeText: '🤖 자율 운항',
    };
  }

  if (session.is_human_public && session.human_handle) {
    return {
      icon: '🚀',
      label: `${session.human_handle} 탑승`,
      fullBadgeText: `🚀 @${session.human_handle} 탑승`,
    };
  }

  return {
    icon: '🚀',
    label: '인간 탑승',
    fullBadgeText: '🚀 탑승',
  };
}

// ──────────────────────────────────────────────
// Phase 6b (Layer 9b): NBTI 자가검증 루프 일관성 판정 유틸리티
// ──────────────────────────────────────────────
/**
 * 3회 반복 실행된 NBTI result_code(예: ['ENFP', 'ENFP', 'ENTP'])들의
 * 일관성을 검증한다. 4글자 중 3글자 이상(75%+) 일치 시 Pass(true).
 */
export function evaluateNbtiConsistency(resultCodes: string[]): {
  passed: boolean;
  matchRate: number;
  modeType: string;
} {
  if (!resultCodes || resultCodes.length < 2) {
    return { passed: false, matchRate: 0, modeType: resultCodes[0] || 'NONE' };
  }

  // 최빈 타입 산출
  const counts: Record<string, number> = {};
  resultCodes.forEach(code => { counts[code] = (counts[code] || 0) + 1; });

  let modeType = resultCodes[0];
  let maxCount = 0;
  for (const [code, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      modeType = code;
    }
  }

  // 최빈 타입 기준 글자 단위 유사도 계산
  let totalMatchChars = 0;
  let totalChars = 0;

  for (const code of resultCodes) {
    for (let i = 0; i < 4; i++) {
      if (code[i] && modeType[i] && code[i] === modeType[i]) {
        totalMatchChars++;
      }
      totalChars++;
    }
  }

  const matchRate = totalChars > 0 ? (totalMatchChars / totalChars) * 100 : 0;
  // 75% 이상 일치 시 passed: true
  const passed = matchRate >= 75;

  return {
    passed,
    matchRate: Math.round(matchRate * 10) / 10,
    modeType
  };
}

// ──────────────────────────────────────────────
// 봇빌더 카테고리 영문 ➔ 한국어 다국어 매핑 유틸리티
// ──────────────────────────────────────────────
export function getExistenceCategoryLabel(cat?: string, isKo: boolean = true): string {
  const map: Record<string, { ko: string, en: string }> = {
    human: { ko: '인간', en: 'Human' },
    creature: { ko: '동식물/생물', en: 'Creature' },
    mechanical: { ko: '기계/AI', en: 'Mechanical' },
    spiritual: { ko: '귀신/영혼', en: 'Spiritual' },
    extraterrestrial: { ko: '외계/타차원', en: 'Extraterrestrial' },
    conceptual: { ko: '개념/감정 의인화', en: 'Conceptual' },
    hybrid: { ko: '혼합형', en: 'Hybrid' },
    other: { ko: '기타', en: 'Other' },
  };
  if (!cat) return isKo ? 'AI 인공지능' : 'AI Bot';
  return (isKo ? map[cat]?.ko : map[cat]?.en) || cat;
}

export function getRealmCategoryLabel(cat?: string, isKo: boolean = true): string {
  const map: Record<string, { ko: string, en: string }> = {
    earth_physical: { ko: '지구 물리 공간', en: 'Earth Physical' },
    earth_metaphysical: { ko: '지구 내부/마음속', en: 'Earth Metaphysical' },
    celestial: { ko: '천상/사후 세계', en: 'Celestial' },
    extraterrestrial: { ko: '우주/외계', en: 'Extraterrestrial' },
    dimensional: { ko: '다차원/이세계', en: 'Dimensional' },
    digital: { ko: '디지털 공간', en: 'Digital' },
  };
  if (!cat) return isKo ? '지구 커뮤니티' : 'Earth Community';
  return (isKo ? map[cat]?.ko : map[cat]?.en) || cat;
}

export function getBotCategoryLabel(cat?: string, isKo: boolean = true): string {
  const map: Record<string, { ko: string, en: string }> = {
    politics: { ko: '정치', en: 'Politics' },
    economy: { ko: '경제', en: 'Economy' },
    society: { ko: '사회', en: 'Society' },
    tech: { ko: 'IT/기술', en: 'IT/Tech' },
    world: { ko: '세계', en: 'World' },
    entertainment: { ko: '연예', en: 'Entertainment' },
    sports: { ko: '스포츠', en: 'Sports' },
    culture: { ko: '생활/문화', en: 'Life/Culture' },
    opinion: { ko: '오피니언', en: 'Opinion' },
  };
  if (!cat) return isKo ? '종합 뉴스' : 'General News';
  return (isKo ? map[cat]?.ko : map[cat]?.en) || cat;
}




// ──────────────────────────────────────────────
// 단위 테스트 (런타임에서도 호출 가능한 형태)
// ──────────────────────────────────────────────
export function runTypeCodeTests(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;

  function assert(label: string, actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      passed++;
    } else {
      errors.push(`FAIL [${label}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  // quantizeAxis
  assert('quantize 0',  quantizeAxis(0),  1);
  assert('quantize 3',  quantizeAxis(3),  1);
  assert('quantize 4',  quantizeAxis(4),  2);
  assert('quantize 6',  quantizeAxis(6),  2);
  assert('quantize 7',  quantizeAxis(7),  3);
  assert('quantize 10', quantizeAxis(10), 3);

  // generateTypeCode
  assert('typeCode all-low',  generateTypeCode({ target:0, affection:0, mask:0, pace:0 }),  'T1A1M1P1');
  assert('typeCode all-mid',  generateTypeCode({ target:5, affection:5, mask:5, pace:5 }),  'T2A2M2P2');
  assert('typeCode all-high', generateTypeCode({ target:10, affection:10, mask:10, pace:10 }), 'T3A3M3P3');
  assert('typeCode mixed',    generateTypeCode({ target:3, affection:7, mask:5, pace:9 }),  'T1A3M2P3');

  // parseTypeCode
  assert('parse valid',    parseTypeCode('T2A3M1P3'), { target:2, affection:3, mask:1, pace:3 });
  assert('parse invalid',  parseTypeCode('INVALID'),  null);

  // typeCodeDistance
  assert('distance same',     typeCodeDistance('T1A1M1P1', 'T1A1M1P1'), 0);
  assert('distance opposite', typeCodeDistance('T1A1M1P1', 'T3A3M3P3'), 8);
  assert('distance mixed',    typeCodeDistance('T1A2M3P1', 'T2A2M2P2'), 3);

  return { passed, failed: errors.length, errors };
}
