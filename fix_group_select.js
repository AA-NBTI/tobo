const fs = require('fs');
let code = fs.readFileSync('src/app/api/ai-reply-group/route.ts', 'utf8');

// Fix column select: remove non-existent columns (bio, axis_profile, type_code)
code = code.replace(
  "select('username, display_name, bio, persona_prompt, ai_model_provider, gender, type_code, axis_profile, speech_style, category')",
  "select('*')"
);

fs.writeFileSync('src/app/api/ai-reply-group/route.ts', code, 'utf8');
console.log('✅ select column fix applied to ai-reply-group/route.ts!');
