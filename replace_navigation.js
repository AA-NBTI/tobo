const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFiles() {
  const targetDirs = [
    path.join(__dirname, 'src/components'),
    path.join(__dirname, 'src/app')
  ];

  let modifiedCount = 0;

  targetDirs.forEach(dir => {
    walkDir(dir, (filePath) => {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Find `next/navigation` imports
        if (content.includes('next/navigation')) {
          content = content.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]next\/navigation['"]/g, (match, p1) => {
            const imports = p1.split(',').map(s => s.trim());
            const i18nImports = imports.filter(i => ['useRouter', 'usePathname', 'redirect'].includes(i));
            const nextImports = imports.filter(i => !['useRouter', 'usePathname', 'redirect'].includes(i));

            let newLines = [];
            if (nextImports.length > 0) {
              newLines.push(`import { ${nextImports.join(', ')} } from 'next/navigation'`);
            }
            if (i18nImports.length > 0) {
              newLines.push(`import { ${i18nImports.join(', ')} } from '@/i18n/routing'`);
            }
            return newLines.join('\n');
          });
        }

        if (content !== originalContent) {
          // consolidate routing imports
          const routingMatches = content.match(/import\s+{([^}]+)}\s+from\s+['"]@\/i18n\/routing['"]/g);
          if (routingMatches && routingMatches.length > 1) {
            let allImports = new Set();
            routingMatches.forEach(m => {
              const matched = m.match(/{([^}]+)}/)[1];
              matched.split(',').forEach(i => allImports.add(i.trim()));
              content = content.replace(m + '\n', '');
              content = content.replace(m, ''); // in case no newline
            });
            const merged = `import { ${Array.from(allImports).join(', ')} } from '@/i18n/routing'`;
            // insert it somewhere at the top
            content = merged + '\n' + content;
          }

          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Updated navigation imports in: ${filePath}`);
          modifiedCount++;
        }
      }
    });
  });

  console.log(`Total files modified for navigation: ${modifiedCount}`);
}

processFiles();
