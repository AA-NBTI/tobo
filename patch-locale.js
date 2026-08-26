const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file === 'page.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('setRequestLocale(')) continue;
      
      // We only care if it's a Server Component page with params
      if (content.includes('export default') && (content.includes('function') || content.includes('const'))) {
        if (content.includes('params') && content.includes('await params')) {
          
          if (!content.includes('setRequestLocale')) {
            // It's a next 15 async params page
            content = content.replace(/(import .* from 'next-intl\/server')/, "import { setRequestLocale } from 'next-intl/server';\n$1");
            if (!content.includes('setRequestLocale } from')) {
              content = "import { setRequestLocale } from 'next-intl/server';\n" + content;
            }
          }
          
          // Fix the Type of params if needed
          content = content.replace(/params:\s*Promise<\{\s*([^}]+)\s*\}>/, (match, p1) => {
            if (!p1.includes('locale')) {
              return `params: Promise<{ ${p1}, locale: string }>`;
            }
            return match;
          });

          // Inject setRequestLocale
          content = content.replace(/const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+params\s*;?/, (match, p1) => {
            if (!p1.includes('locale')) {
              return match.replace(p1, p1 + ', locale') + '\n  setRequestLocale(locale);';
            } else {
              return match + '\n  setRequestLocale(locale);';
            }
          });
          
          
          fs.writeFileSync(fullPath, content);
          console.log('Patched', fullPath);
        }
      }
    }
  }
}

processDir('f:/projects/NN-nogoodnews/src/app/[locale]');
