const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
    const prompt = 'Return the following JSON exactly: {"displayName": "Test-Test"}';
    const result = await model.generateContent(prompt);
    console.log('--- OUTPUT ---');
    console.log(result.response.text());
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
run();
