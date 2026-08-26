const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const targetDirs = [
  path.join(__dirname, 'src/components'),
  path.join(__dirname, 'src/app')
];

targetDirs.forEach(dir => {
  walkDir(dir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Extract routing imports
      const routingRegex = /import\s+{([^}]+)}\s+from\s+['"]@\/i18n\/routing['"]/g;
      
      content = content.replace(routingRegex, (match, p1) => {
        let imports = p1.split(',').map(s => s.trim());
        let i18nImports = imports.filter(i => ['useRouter', 'Link'].includes(i));
        let nextImports = imports.filter(i => ['redirect', 'usePathname'].includes(i));
        
        let newLines = [];
        if (i18nImports.length > 0) {
          newLines.push(`import { ${i18nImports.join(', ')} } from '@/i18n/routing'`);
        }
        if (nextImports.length > 0) {
          // Instead of adding a new import here, we can just inject it at the top or let a second pass handle it
          newLines.push(`import { ${nextImports.join(', ')} } from 'next/navigation'`);
        }
        return newLines.join('\n');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Reverted redirect/usePathname in: ${filePath}`);
      }
    }
  });
});
