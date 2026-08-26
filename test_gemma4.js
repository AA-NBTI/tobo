const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
    const prompt = `당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.
이번 기획 등급: 라이트 (댓글 소통 전문 유저)

[필수 지정 카테고리 & 존재유형 & 성별]
- 전문 분야 카테고리: "politics"
- 존재 유형(existence_category): "human"
- 성별(gender): "female"

[닉네임(displayName) 필수 생성 규칙 - 엄격 준수!]
1. 닉네임은 반드시 "한글명칭-EnglishName" 형태로 하이픈('-')을 사용하여 한글과 영어를 같이 표기하세요.

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "한글-영어 병행 닉네임",
  "coreIdentity": "유저의 핵심 정체성을 1~2줄로 강렬하게 요약",
  "category": "politics",
  "existence_category": "human",
  "gender": "female",
  "role": "comment"
}`;
    const result = await model.generateContent(prompt);
    console.log('--- RAW OUTPUT START ---');
    console.log(result.response.text());
    console.log('--- RAW OUTPUT END ---');
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
run();
