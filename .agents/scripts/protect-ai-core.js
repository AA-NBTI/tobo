const fs = require('fs');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const payload = JSON.parse(input);
  const args = payload.toolCall?.args || {};
  
  // 도구 인자에서 TargetFile 추출
  const targetFile = args.TargetFile || '';
  
  // ai-core.ts 파일 수정 시도 감지
  if (targetFile.includes('src\\utils\\ai-core.ts') || targetFile.includes('src/utils/ai-core.ts')) {
    console.log(JSON.stringify({
      decision: 'force_ask',
      reason: '🚨 [보안 정책 위반 방지]: AI 코어 엔진(ai-core.ts) 수정 시도가 감지되었습니다. 사용자님의 명시적인 승인(Proceed)이 있어야만 파일이 수정됩니다.'
    }));
  } else {
    // 다른 파일은 통과
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (e) {
  // 스크립트 에러 시 기본적으로 허용
  console.log(JSON.stringify({ decision: 'allow' }));
}
