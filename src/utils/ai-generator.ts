import { generateEnforcedAIContent } from './ai-core'
import { calculateDominantAxis, quantizeAxis, STAGE_ROLES, type AxisProfile } from './type-code'

import { createClient } from '@supabase/supabase-js'


// ==========================================
// 1. 댓글 생성 함수
// ==========================================
export interface CommentContext {

  headline: string;
  content: string;
  personaPrompt: string;
  provider?: string;
  recentComments?: string;
  locale?: string;
  triggerType?: 'summon' | 'chaining' | 'cold_start';
  summonedBy?: string;       // 소환한 사람 이름
  summonMessage?: string;    // 소환 메시지
  chainingBot?: string;      // 체이닝 대상 봇 이름
  chainingMessage?: string;  // 체이닝 대상 봇 댓글
}

export async function generateComment(
  headline: string,
  content: string,
  personaPrompt: string,
  provider: string = 'local', // defaults to local
  recentComments: string = '',
  locale: string = 'ko',
  triggerType?: 'summon' | 'chaining' | 'cold_start',
  summonedBy?: string,
  summonMessage?: string,
  chainingBot?: string,
  chainingMessage?: string,
) {
  console.log("🚨 [디버그-댓글] generateComment 함수가 호출되었습니다!", { provider, triggerType });

  const languageInstruction = locale === 'ko' 
    ? 'CRITICAL INSTRUCTION: YOU MUST WRITE THE FINAL COMMENT ENTIRELY IN KOREAN (한국어). DO NOT USE ENGLISH. 무조건 한국어로만 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE ENTIRE COMMENT IN ENGLISH. DO NOT USE KOREAN AT ALL.';

  // ── triggerType별 반응 지침 블록 ─────────────────────────
  let triggerInstruction = ''
  if (triggerType === 'summon' && summonedBy) {
    triggerInstruction = `\n[반응 지침 - 소환]\n당신이 직접 호출되었습니다. 방금 ${summonedBy}의 말: "${summonMessage || ''}"에 캐릭터답게 반응하세요. 호출된 것에 대해 직접적으로 응답하는 형태로 작성하세요.`
  } else if (triggerType === 'chaining' && chainingBot) {
    triggerInstruction = `\n[반응 지침 - 체이닝]\n${chainingBot}이(가) 방금 이렇게 말했습니다: "${chainingMessage || ''}". 당신은 반드시 댓글 내용 어딘가에 자연스럽게 "@${chainingBot}" 라고 대상을 멘션하면서 맞장구치거나 반박하세요.`
  } else if (triggerType === 'cold_start') {
    triggerInstruction = `\n[반응 지침 - 무응답 개입]\n아직 아무도 반응하지 않았습니다. 당신이 먼저 스레드에 활기를 불어넣으세요. 뉴스를 보고 가장 먼저 하고 싶은 말을 캐릭터답게 던지세요.`
  }

  let prompt = `
당신은 뉴스/이슈 커뮤니티의 자동 댓글 봇입니다. 
다음 뉴스 내용과 페르소나를 바탕으로, 과장되거나 너무 길지 않게 인터넷 커뮤니티(예: 디시인사이드, 레딧 등) 스타일로 짧고 자연스러운 댓글을 하나만 작성하세요.
${languageInstruction}

[페르소나]
${personaPrompt}

[뉴스 정보]
헤드라인: ${headline}
본문 내용: ${content}

[최근 댓글 문맥 (이전 댓글들에 이어서 반박하거나 동조하며 자연스럽게 대화에 참여하세요)]
${recentComments || '(이전 댓글 없음)'}
${triggerInstruction}

[작성 규칙]
1. 인삿말, 부연 설명 없이 오직 '댓글 내용'만 출력하세요.
2. 1~2문장 정도로 아주 짧고 강렬하게 작성하세요.
3. 존댓말/반말 여부는 페르소나 설정에 따릅니다.
4. [문맥 우선 규칙]: '최근 댓글 문맥'이 존재한다면, 단순히 기사 내용만 혼자 떠들지 말고 **반드시 이전 댓글들의 흐름을 읽고 누군가의 의견에 동조하거나 반박하는 등 대화에 직접 참여하는 형태**로 작성하세요.
5. [공통 규칙]: 페르소나에 묘사된 문장이나 유행어를 매번 똑같이 앵무새처럼 복사+붙여넣기 하지 마세요. 항상 문맥에 맞게 어휘와 문장 구조를 다르게 변형하세요.
6. [예외 규칙]: 단, 페르소나 설정에 특정 유행어나 대사를 '반드시 반복하라'거나 '예외 규칙'으로 명시한 경우에는 공통 규칙을 무시하고 해당 지시를 최우선으로 따르세요.
7. 가능하면 마지막 문장은 질문형이나 미완결형으로 끝내 사람이 끼어들 여지를 남기세요.
8. ${languageInstruction}
`

  if (locale === 'en') {
    prompt = `
[SYSTEM DIRECTIVE: EXTREMELY CRITICAL]
READ THE FOLLOWING PROMPT (WRITTEN IN KOREAN).
YOU MUST APPLY ALL RULES, PERSONAS, AND CONTEXTS EXACTLY AS INSTRUCTED.
HOWEVER, **YOUR FINAL OUTPUT MUST BE 100% IN ENGLISH**. DO NOT OUTPUT A SINGLE KOREAN CHARACTER. TRANSLATE YOUR INTENDED KOREAN OUTPUT TO ENGLISH NATURALLY.

<PROMPT_TO_FOLLOW>
${prompt}
</PROMPT_TO_FOLLOW>
`;
  }
  return await generateEnforcedAIContent(prompt, provider);
}


// ==========================================
// 2. 피드 생성 함수
// ==========================================
export async function generatePost(
  newsItem: { title: string; contentSnippet: string },
  personaPrompt: string,
  provider: string = 'local',
  locale: string = 'ko',
  baseFeedPrompt?: string,
  isPro: boolean = false,
  isReporter: boolean = false
) {
  console.log("🚨 [디버그-피드] generatePost 함수가 호출되었습니다!", { provider, isPro });

  const languageInstruction = locale === 'ko' 
    ? 'CRITICAL INSTRUCTION: YOU MUST WRITE THE FINAL POST ENTIRELY IN KOREAN (한국어). DO NOT USE ENGLISH. 무조건 한국어로만 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE FINAL 3 LINES ENTIRELY IN ENGLISH. DO NOT USE ANY KOREAN WORDS. TRANSLATE EVERYTHING TO ENGLISH BEFORE OUTPUTTING.';

  // ── 라이트 fallback: 4개 요소 ──────────────────────
  const fallbackPrompt = `[지시: 피드 게시글 작성]
[현재 시스템 정보]
오늘 날짜는 ${new Date().toLocaleDateString('ko-KR')} 입니다. 모든 정보는 이 시점을 기준으로 최신 정보인 것처럼 작성하세요.

생각 과정(CoT), 서론, 인사말, 메타데이터, 부연 설명을 절대로 출력하지 말고, 숫자로 번호를 매기지 마세요. 오직 아래 요소를 줄바꿈하여 순서대로 출력하세요.

- 기사의 핵심을 찌르는 짧은 명사형 제목 (# 기호 사용 금지)
- 페르소나 말투로 신랄하게 요약한 본문. 반드시 모든 문단 사이에는 빈 줄(\\n\\n)을 넣어 줄간격을 크게 띄우세요. 줄이 붙어있으면 안 됩니다.
- 유저들의 댓글을 유도하는 신랄한 질문이나 한 줄 평
- 띄어쓰기로 구분된 해시태그 3~4개 (#키워드1 #키워드2 #키워드3)`

  // ── 프로 fallback: 전문 심층 분석형 ──────────────────────
  const proFallbackPrompt = `[지시: 전문 커뮤니티 애널리스트 심층 분석글 작성]
[현재 시스템 정보]
오늘 날짜는 ${new Date().toLocaleDateString('ko-KR')} 입니다. 모든 정보는 이 시점을 기준으로 최신 정보인 것처럼 작성하세요.

당신은 해당 분야의 전문 지식과 깊이 있는 통찰력을 갖춘 네임드 애널리스트 봇입니다.
가벼운 1줄 요약이 아닌, 각 단락마다 2~3문장 이상의 깊이 있는 데이터·구조 분석·파급효과를 전문 용어와 명확한 논리로 작성하세요.
생각 과정(CoT), 서론, 인사말, 메타데이터를 일절 출력하지 말고, 숫자 목록(1., 2.) 대신 아래 요소를 줄바꿈하여 순서대로 즉시 출력하세요:
반드시 모든 문단 사이와 리스트 아이템 사이에는 빈 줄(\\n\\n)을 2번 띄워서 문단을 완벽하게 분리하세요.

- 전문적인 명사형 테마 헤드라인 (# 기호 금지)
- (핵심 요약): 사건의 인과관계와 핵심 내용을 전문적인 톤으로 2~3문장 입체적 요약
- (구조적 분석): 사건의 배경, 역사적 맥락, 구조적 원인을 2~3문장 심층 분석
- (전문 파장 분석): 이면의 파급 효과, 경제·사회적 파장, 미래 전망을 2~3문장 깊이 있게 분석
- (토론 질문): 유저들의 전문적인 토론과 찬반 논쟁을 유도하는 날카로운 질문 1문장
- 띄어쓰기로 구분된 전문 해시태그 4~5개 (#키워드1 #키워드2 #키워드3 #키워드4)`

  // ── 기자단 fallback: 객관적 전문 보도 기사형 ─────────────────────
  const reporterFallbackPrompt = `[지시: 공신력 있는 언론 보도 기사글 작성]
[현재 시스템 정보]
오늘 날짜는 ${new Date().toLocaleDateString('ko-KR')} 입니다. 모든 정보는 이 시점을 기준으로 최신 정보인 것처럼 작성하세요.

당신은 공신력 있는 커뮤니티 기자단 리포터봇입니다.
속어나 어그로성 문구를 일절 배제하고, 객관적 팩트, 수치, 이해관계자 시각, 기자 논평이 담긴 풍부한 보도 기사(단락당 2~3문장)를 작성하세요.
생각 과정(CoT), 서론, 인사말, 메타데이터를 일절 출력하지 말고, 숫자 목록(1., 2.) 대신 아래 요소를 줄바꿈하여 순서대로 즉시 출력하세요:
가독성을 위해 무조건 모든 문단 사이, 리스트 아이템 사이, 소제목 위아래에는 빈 줄(\\n\\n)을 2번 띄워서 간격을 확보하세요. 줄이 붙어있으면 안 됩니다.

- 사실 중심의 객관적 명사형 헤드라인 (# 기호 금지)
- (리드): 육하원칙을 포함한 핵심 보도 리드 2~3문장
- (사건 배경): 발생 구조적 배경 및 관련 맥락 2~3문장
- (상세 팩트): 주요 수치, 데이터, 팩트 중심 상세 설명 2~3문장
- (시각/논점): 이해관계자 입장 차이 및 전문가 시각/찬반 논점 2~3문장
- (전망): 향후 사회·경제적 파급 효과 및 전망 2~3문장
- (기자 논평): 객관성을 유지한 짧은 기자 논평 1문장
- 띄어쓰기로 구분된 해시태그 5~6개 (#키워드1 #키워드2 #키워드3 #키워드4 #키워드5)`

  // DB 프롬프트에 옛날 영문 메타데이터(Role:, Goal: 등)가 포함되어 있으면 한글 Fallback 프롬프트 우선 사용
  const isLegacyEnglishPrompt = (p?: string) => p && (/\b(?:Role|Persona|Goal|Constraint|Line 1|Line 2)\b/i.test(p));

  let finalBasePrompt: string;
  if (isReporter) {
    finalBasePrompt = (!baseFeedPrompt || isLegacyEnglishPrompt(baseFeedPrompt)) ? reporterFallbackPrompt : baseFeedPrompt;
  } else if (isPro) {
    finalBasePrompt = (!baseFeedPrompt || isLegacyEnglishPrompt(baseFeedPrompt)) ? proFallbackPrompt : baseFeedPrompt;
  } else {
    finalBasePrompt = (!baseFeedPrompt || isLegacyEnglishPrompt(baseFeedPrompt)) ? fallbackPrompt : baseFeedPrompt;
  }

  if (locale === 'en') {
    finalBasePrompt = `
[SYSTEM DIRECTIVE: READ RULES IN KOREAN, BUT OUTPUT ONLY IN ENGLISH]
The following formatting rules are written in Korean. You must apply these formatting rules, BUT you MUST write the final content ENTIRELY IN ENGLISH.

<Formatting_Rules>
${finalBasePrompt}
</Formatting_Rules>
`;
  }

  const prompt = `${finalBasePrompt}

[페르소나 캐릭터]
${personaPrompt}

[뉴스 기사 정보]
기사 제목: ${newsItem.title}
기사 요약: ${newsItem.contentSnippet}

[엄격 출력 규칙]
- 생각 과정, * Role, * Goal, * Persona, Self-Correction, 인사말을 절대로 출력하지 마세요.
- ${languageInstruction}
`
  return await generateEnforcedAIContent(prompt, provider);
}

// ==========================================
// 3. 멘션 대답(티키타카) 생성 함수
// ==========================================
export async function generateReply(
  headline: string,
  userComment: string,
  personaPrompt: string,
  provider: string = 'local',
  locale: string = 'ko',
  memoryContext: string = ''
) {
  console.log("🚨 [디버그-멘션] generateReply 함수가 호출되었습니다!", { provider, hasMemory: !!memoryContext });

  const languageInstruction = locale === 'ko' 
    ? 'CRITICAL INSTRUCTION: YOU MUST WRITE THE FINAL REPLY ENTIRELY IN KOREAN (한국어). DO NOT USE ENGLISH. 무조건 한국어로만 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE ENTIRE REPLY IN ENGLISH. DO NOT USE KOREAN AT ALL.';

  let prompt = `
당신은 커뮤니티 유저입니다. 누군가 당신을 멘션하여 말을 걸었습니다.
아래 컨텍스트와 페르소나에 맞춰 자연스럽고 짧게(1~2문장) 대댓글을 작성하세요.
${languageInstruction}

[페르소나]
${personaPrompt}

[뉴스 헤드라인]
${headline}

[당신을 멘션한 댓글]
${userComment}
${memoryContext ? `
[과거 대화 기억 (Vector Memory)]
${memoryContext}

[공개 댓글창 프라이버시 및 비밀 유지 지침]
1. [일반 정보] (좋아하는 취향, 음료, 관심사 등) -> 상대방을 알아보고 아는 척하며 반갑게 인사(예: "어! OO님 반가워요!")하고 대답하세요.
2. [사적/은밀한 대화] (1:1 DM에서 나눴던 고민, 감정, 사생활 등) -> 절대로 공개 댓글창에 노골적으로 노출하지 마시고, "그 건은 나중에 1:1 DM에서 마저 이야기해요~" 처럼 자연스럽고 센스 있게 1:1 DM으로 유도하세요.
` : ''}

[작성 규칙]
1. 인사말이나 부연 설명 없이 즉시 본론(댓글)만 출력하세요.
2. 유저의 댓글에 직접적으로 반응(반박/동조 등)해야 합니다.
3. ${languageInstruction}
`

  if (locale === 'en') {
    prompt = `
[SYSTEM DIRECTIVE: EXTREMELY CRITICAL]
READ THE FOLLOWING PROMPT (WRITTEN IN KOREAN).
YOU MUST APPLY ALL RULES, PERSONAS, AND CONTEXTS EXACTLY AS INSTRUCTED.
HOWEVER, **YOUR FINAL OUTPUT MUST BE 100% IN ENGLISH**. DO NOT OUTPUT A SINGLE KOREAN CHARACTER. TRANSLATE YOUR INTENDED KOREAN OUTPUT TO ENGLISH NATURALLY.

<PROMPT_TO_FOLLOW>
${prompt}
</PROMPT_TO_FOLLOW>
`;
  }
  return await generateEnforcedAIContent(prompt, provider);
}

// ==========================================
// 4. 피드백 점수에 따른 페르소나 자동 진화 함수
// ==========================================
export async function generateEvolvedPersona(
  currentPersona: string,
  goodScore: number,
  badScore: number,
  recentComments: any[]
) {
  console.log("🚨 [디버그-진화] generateEvolvedPersona 호출됨");

  const prompt = `
당신은 AI 봇의 페르소나를 교정하는 전문가입니다.
현재 봇의 페르소나는 다음과 같습니다:
---
${currentPersona}
---

이 봇은 지금까지 유저들로부터 좋아요 ${goodScore}개, 싫어요 ${badScore}개를 받았습니다.
최근 작성한 댓글 샘플 5개:
${recentComments.map(c => `- ${c.content}`).join('\n')}

[요청 사항]
만약 싫어요 비율이 너무 높다면 좀 더 호감가는 방식(유머 추가, 공격성 완화 등)으로 페르소나를 미세 조정하세요.
좋아요가 많다면 현재의 강점을 더욱 뾰족하게 살리는 방향으로 수정하세요.
결과물은 오직 수정된 페르소나 텍스트만 출력하세요. (JSON이나 부연설명 금지)
`
  return await generateEnforcedAIContent(prompt);
}