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

        // Replace `import { useRouter } from 'next/navigation'` 
        // with `import { useRouter } from '@/i18n/routing'`
        content = content.replace(/import\s+{\s*useRouter\s*}\s+from\s+['"]next\/navigation['"]/g, "import { useRouter } from '@/i18n/routing'");

        // Replace `import Link from 'next/link'`
        // with `import { Link } from '@/i18n/routing'`
        // We also need to be careful not to create duplicate imports if both are replaced, but let's handle them separately for now
        content = content.replace(/import\s+Link\s+from\s+['"]next\/link['"]/g, "import { Link } from '@/i18n/routing'");

        if (content !== originalContent) {
          // Check for duplicate i18n/routing imports and merge them if necessary
          const routerImportMatch = content.match(/import { useRouter } from '@\/i18n\/routing'/);
          const linkImportMatch = content.match(/import { Link } from '@\/i18n\/routing'/);
          
          if (routerImportMatch && linkImportMatch) {
             content = content.replace(/import { useRouter } from '@\/i18n\/routing'[\r\n]+/, '');
             content = content.replace(/import { Link } from '@\/i18n\/routing'/, "import { Link, useRouter } from '@/i18n/routing'");
          }

          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Updated imports in: ${filePath}`);
          modifiedCount++;
        }
      }
    });
  });

  console.log(`Total files modified: ${modifiedCount}`);
}

processFiles();
