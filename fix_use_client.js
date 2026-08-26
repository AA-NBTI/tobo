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

let fixedCount = 0;

targetDirs.forEach(dir => {
  walkDir(dir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // If it contains 'use client' but not at the very start
      if (content.includes("'use client'") || content.includes('"use client"')) {
        const useClientMatch = content.match(/^['"]use client['"][;\n]?/m);
        if (useClientMatch && useClientMatch.index > 0) {
          // Remove the matched 'use client' from wherever it is
          content = content.replace(useClientMatch[0], '');
          // Prepend it to the start of the file
          content = "'use client'\n" + content.trimStart();
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Fixed use client in: ${filePath}`);
          fixedCount++;
        }
      }
    }
  });
});

console.log(`Total fixed: ${fixedCount}`);
