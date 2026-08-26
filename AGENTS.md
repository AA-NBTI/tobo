<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:version-update-rule -->
# Version Update Rule

When the user requests a version update (e.g. "V9.03.3 로컬 패키지 저장", "버전업 해줘"), you MUST ALWAYS update the `"version"` field in `package.json` to match the requested version BEFORE committing and pushing. This is a strict user requirement.
<!-- END:version-update-rule -->
