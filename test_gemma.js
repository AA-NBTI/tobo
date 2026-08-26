const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it', generationConfig: { maxOutputTokens: 500 } });
    const prompt = `당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "한글-영어 병행 닉네임",
  "coreIdentity": "유저의 핵심 정체성을 1~2줄로 강렬하게 요약"
}`;
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
run();
