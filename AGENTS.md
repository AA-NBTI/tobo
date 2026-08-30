<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:version-update-rule -->
# Version Update Rule

When the user requests a version update (e.g. "V9.03.3 로컬 패키지 저장", "버전업 해줘"), you MUST ALWAYS update the `"version"` field in `package.json` to match the requested version BEFORE committing and pushing. This is a strict user requirement.
<!-- END:version-update-rule -->

<!-- BEGIN:core-modification-policy -->
# Core AI Logic Modification Ban (CRITICAL)

**DO NOT MODIFY** `src/utils/ai-core.ts` or any LLM model name strings (e.g. `gemma-4-31b-it`, `gemini-1.5-flash`) anywhere in the codebase UNLESS the user EXPLICITLY commands you to change the AI model. 
If an error occurs related to AI responses, assume the issue is with the prompt, the DB, or the external API key/quota, NOT the model name itself. Never try to "fix" an LLM error by arbitrarily switching to a different model name (like gemini-3.6-flash).
When in doubt about core AI logic, **STOP AND ASK THE USER FIRST.**
<!-- END:core-modification-policy -->
