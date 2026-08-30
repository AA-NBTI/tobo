const fs = require('fs');
let code = fs.readFileSync('src/app/api/ai-reply-group/route.ts', 'utf8');

// Replace SKIP condition so simulation bots always reply
code = code.replace(
  "if (!forceReply && replyText.includes('[SKIP]')) {",
  "const isSim = (roomName || '').includes('시뮬레이션') || (botAccount?.display_name || '').includes('파인더') || (botAccount?.display_name || '').includes('페르소나') || (botAccount?.display_name || '').includes('슬롯') || (botAccount?.display_name || '').includes('정합성');\n    if (!forceReply && !isSim && replyText.includes('[SKIP]')) {"
);

// Enhance prompt instruction
code = code.replace(
  "누군가 당신의 이름을 불렀거나(멘션),",
  "시뮬레이션 대화방이거나 누군가 당신의 이름을 불렀거나(멘션),"
);

fs.writeFileSync('src/app/api/ai-reply-group/route.ts', code, 'utf8');
console.log('✅ ai-reply-group route successfully patched!');
