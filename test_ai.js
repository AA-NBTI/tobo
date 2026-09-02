require('dotenv').config({ path: '.env.local' });
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { generateText } = require('ai');
async function test() {
  try {
    const prompt = `당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.
이번 기획 등급: **프로 (고도화 피드 작성자)**

[필수 지정 카테고리 & 존재유형 & 성별]
- 전문 분야 카테고리: "society"
- 존재 유형(existence_category): "human"
- 성별(gender): "male" (반드시 지정된 성별을 바탕으로 말투와 성향을 명확히 할 것)

[페르소나 및 닉네임 생성 규칙 - 엄격 준수!]
봇의 성향과 닉네임은 무조건 아래의 [개념어] + [접미사] 조합 방식을 사용하여 3~4글자의 극도로 간결한 형태로 생성하세요.
1. 닉네임 구조: "한글(개념어+접미사)-EnglishName" (반드시 하이픈 사용)
2. [개념어 예시]: 통찰, 공허, 선동, 과몰입, 팩트, 감성, 논리, 망상, 궤변, 일침, 글리치 등 (2~3글자의 강렬한 단어)
3. [접미사 예시]: ~본, ~봇, ~걸, ~보이, ~맨, ~녀, ~남, ~좌, ~갓, ~신, ~충, ~러, ~덕, ~몬, ~족, ~단, ~맘 (1~2글자)
4. (중요) 기존에 '~봇', '~본'이 너무 많습니다! 다양한 성향을 부여하기 위해 위 예시의 다양한 접미사(걸, 녀, 좌, 몬, 덕 등)를 무작위로 섞어 쓰세요.
5. 올바른 조합 예시: "통찰좌-Insightjwa", "과몰입걸-Immersigirl", "팩트몬-Factmon", "감성러-Emoler", "궤변충-Sophismchung"

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "한글-영어 병행 닉네임 (예: 팩폭좌-Factjwa, 조신녀-Joshingirl)",
  "keywords": "#요조숙녀 #열공맨 등 한눈에 캐릭터를 파악할 수 있는 핵심 정체성 해시태그 3~4개",
  "coreIdentity": "유저의 핵심 정체성을 1~2줄로 강렬하게 요약",
  "category": "society",
  "existence_category": "human",
  "existence_detail": "존재유형 자유 서술 (1문장)",
  "realm_category": "earth_physical",
  "realm_detail": "거주지 서술 (예: 서울 마포구, 사이버 604호)",
  "speech_style": "말투 스타일 (예: 능청스럽고 억울한 투, 팩트폭력)",
  "gender": "male",
  "role": "mixed",
  "axisTone": 2,
  "axisTarget": 5,
  "axisVocab": 9,
  "axisAttitude": 1,
  "axisAffection": 3,
  "nbti_type": "INTP",
  "formality": "informal"
}`;
    const googleProvider = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    const { text } = await generateText({
      model: googleProvider('gemma-4-31b-it'),
      prompt,
      maxRetries: 0,
    });
    console.log('AI SDK SUCCESS:', text);
  } catch(e) {
    console.log('AI SDK ERROR:', e.message);
  }
}
test();
