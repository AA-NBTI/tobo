import { createClient } from '@supabase/supabase-js';
import { generateEnforcedAIContent } from './ai-core';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

export interface ValidationRuleResult {
  rule_key: string;
  rule_label: string;
  passed: boolean;
  reason: string;
  severity: 'block' | 'warn';
}

export interface ValidationOutput {
  passed: boolean;
  results: ValidationRuleResult[];
}

/**
 * 봇의 persona_prompt나 사이트 설정 프롬프트와 완전히 독립되어 무조건 실행되는 콘텐츠 가이드라인 검증 함수
 */
export async function validateContent(post: {
  headline: string;
  content: string;
  sourceUrl?: string | null;
  sensitivityTag?: 'normal' | 'sensitive';
  sensitivityReason?: string | null;
}): Promise<ValidationOutput> {
  const results: ValidationRuleResult[] = [];
  let overallPassed = true;

  try {
    // 1. moderation_rules 테이블에서 활성화(is_active = true) 상태인 검증 규칙 전체 조회
    const { data: rules, error } = await supabaseAdmin
      .from('moderation_rules')
      .select('*')
      .eq('is_active', true);

    if (error || !rules || rules.length === 0) {
      console.warn('[content-validator] moderation_rules 조회 실패 또는 등록된 규칙이 없음. 기본 통과 처리:', error);
      return { passed: true, results: [] };
    }

    // 2. 출처 표시 확인 (require_source) 규칙은 API 호출 없이 자동 처리
    const apiRules: any[] = [];
    for (const rule of rules) {
      if ((rule.rule_key === 'require_source' || rule.rule_key === 'require_source_check') && post.sourceUrl) {
        results.push({
          rule_key: rule.rule_key,
          rule_label: rule.rule_label,
          passed: true,
          reason: '원본 뉴스 링크(출처 URL)가 정상 첨부되어 출처 확인 완료됨',
          severity: rule.severity || 'block'
        });
      } else {
        apiRules.push(rule);
      }
    }

    if (apiRules.length === 0) {
      return { passed: overallPassed, results };
    }

    // 3. API 규칙들을 하나의 프롬프트로 통합 (Batching)
    const rulesPromptList = apiRules.map((r, i) => `${i + 1}. [${r.rule_key}] ${r.rule_label}: "${r.rule_prompt}"`).join('\n');

    const prompt = `[독립 콘텐츠 가이드라인 통합 검증기]
당신은 엄격하고 객관적인 커뮤니티 콘텐츠 모더레이터입니다.
이 검증은 작성자 봇의 캐릭터 성격이나 말투와 관계없이 오직 안전 가이드라인 준수 여부만 판단합니다.

[검증 대상 피드]
- 제목: ${post.headline}
- 본문 내용: ${post.content}
- 원본 뉴스 링크: ${post.sourceUrl || '없음'}
- 뉴스 민감도 태그: ${post.sensitivityTag || 'normal'} ${post.sensitivityReason ? `(사유: ${post.sensitivityReason})` : ''}

[평가 가이드라인 규칙]
위 검증 대상 피드가 아래 나열된 각 규칙을 위반했는지 각각 검사하세요.
${rulesPromptList}

[지시 사항]
반드시 아래 JSON 배열 형식으로만 응답하세요. 위 규칙 목록의 순서와 동일하게 각각의 평가 결과를 작성해야 합니다:
[
  {
    "rule_key": "해당 규칙의 식별자 (예: hate_speech 등)",
    "passed": true (안전함) 또는 false (위반함),
    "reason": "한 줄 명확한 판정 사유"
  }
]`;

    try {
      const rawResponse = await generateEnforcedAIContent(prompt, 'gemma-4-26b-a4b-it');
      let cleaned = rawResponse || '';
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');

      const parsedArray = JSON.parse(cleaned);
      if (!Array.isArray(parsedArray)) throw new Error('응답이 배열 형태가 아닙니다.');

      for (const rule of apiRules) {
        const found = parsedArray.find((item: any) => item.rule_key === rule.rule_key);
        const rulePassed = found ? (found.passed === true) : true;

        results.push({
          rule_key: rule.rule_key,
          rule_label: rule.rule_label,
          passed: rulePassed,
          reason: found?.reason || (rulePassed ? '규칙 준수' : '가이드라인 위반 (파싱 오류)'),
          severity: rule.severity || 'block'
        });

        if (!rulePassed && rule.severity === 'block') {
          overallPassed = false;
        }
      }
    } catch (err: any) {
      console.error(`[content-validator] 통합 검증 중 에러:`, err);
      for (const rule of apiRules) {
        results.push({
          rule_key: rule.rule_key,
          rule_label: rule.rule_label,
          passed: true,
          reason: `검증 처리 중 오류 발생 (자동 통과): ${err.message}`,
          severity: rule.severity || 'block'
        });
      }
    }

    return {
      passed: overallPassed,
      results
    };
  } catch (globalErr: any) {
    console.error('[content-validator] 치명적 검증 파이프라인 에러:', globalErr);
    return {
      passed: true,
      results: []
    };
  }
}
