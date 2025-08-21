#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = 'src';
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDE_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/,
  /\/app\/.*\/page\.tsx$/,  // Next.js pages
  /\/app\/layout\.tsx$/,    // Next.js layout
  /\/app\/(manifest|robots|sitemap)\.ts$/,  // Next.js special files
  /\/app\/api\/.*\/route\.(ts|tsx|js|jsx)$/  // Next.js API routes
];

// Find all source files
const findSourceFiles = (dir) => {
  const results = [];
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...findSourceFiles(filePath));
    } else if (
      EXTENSIONS.includes(path.extname(filePath)) && 
      !EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
    ) {
      results.push(filePath);
    }
  }
  
  return results;
};

// Special handling for Next.js and barrel files
const isImplicitlyUsed = (file) => {
  // Next.js implicitly used files
  if (
    file.includes('/app/') && (
      file.endsWith('/page.tsx') ||
      file.endsWith('/layout.tsx') ||
      file.endsWith('/loading.tsx') ||
      file.endsWith('/error.tsx') ||
      file.endsWith('/not-found.tsx') ||
      file.includes('/api/') && file.endsWith('/route.tsx')
    )
  ) {
    return true;
  }
  
  // Other special Next.js files
  if (
    file === 'src/app/manifest.ts' ||
    file === 'src/app/robots.ts' ||
    file === 'src/app/sitemap.ts' ||
    file === 'src/app/global-error.tsx'
  ) {
    return true;
  }
  
  return false;
};

// Find out which files are used via grep
const findReferencedFiles = () => {
  const referencedFiles = new Set();
  const allSourceFiles = findSourceFiles(SRC_DIR);
  
  // Track implicit usage
  allSourceFiles.forEach(file => {
    if (isImplicitlyUsed(file)) {
      referencedFiles.add(file);
    }
  });
  
  // Track files that are directly imported
  allSourceFiles.forEach(file => {
    const relativePath = path.relative(SRC_DIR, file).replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Try different import patterns
    const importPatterns = [
      `from ['"]@/${relativePath}['"]`,
      `from ['"]@/${relativePath}/`,
      `from ['"]\\.\\./${path.basename(relativePath)}['"]`,
      `from ['"]\\./${path.basename(relativePath)}['"]`,
      `from ['"]${relativePath}['"]`,
    ];
    
    for (const pattern of importPatterns) {
      try {
        const result = execSync(`grep -r "${pattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" ${SRC_DIR} 2>/dev/null || true`, { encoding: 'utf8' });
        if (result.trim()) {
          referencedFiles.add(file);
          break;
        }
      } catch (error) {
        // Ignore grep errors
      }
    }
    
    // Also check if it's referenced directly by filename
    const filename = path.basename(file);
    try {
      const result = execSync(`grep -r "${filename}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" ${SRC_DIR} 2>/dev/null || true`, { encoding: 'utf8' });
      if (result.trim()) {
        referencedFiles.add(file);
      }
    } catch (error) {
      // Ignore grep errors
    }
  });
  
  // Check for files re-exported in index files
  allSourceFiles
    .filter(file => file.endsWith('index.ts') || file.endsWith('index.tsx') || file.endsWith('index.js') || file.endsWith('index.jsx'))
    .forEach(indexFile => {
      const content = fs.readFileSync(indexFile, 'utf8');
      const dirPath = path.dirname(indexFile);
      
      // Simple regex to find exports
      const exportMatches = content.match(/export.*from ['"]\.\/([^'"]+)['"]/g) || [];
      
      exportMatches.forEach(match => {
        const exportedFile = match.match(/['"]\.\/([^'"]+)['"]/)[1];
        
        // Check for each possible extension
        for (const ext of EXTENSIONS) {
          const fullPath = path.join(dirPath, exportedFile + ext);
          if (fs.existsSync(fullPath)) {
            referencedFiles.add(fullPath);
            break;
          }
        }
      });
      
      // Check for export * from statements
      const exportAllMatches = content.match(/export \* from ['"]\.\/([^'"]+)['"]/g) || [];
      
      exportAllMatches.forEach(match => {
        const exportedDir = match.match(/['"]\.\/([^'"]+)['"]/)[1];
        
        // If it's a directory, mark all files in the directory as referenced
        const fullDirPath = path.join(dirPath, exportedDir);
        if (fs.existsSync(fullDirPath) && fs.statSync(fullDirPath).isDirectory()) {
          fs.readdirSync(fullDirPath)
            .filter(file => EXTENSIONS.includes(path.extname(file)))
            .forEach(file => {
              referencedFiles.add(path.join(fullDirPath, file));
            });
        } else {
          // It might be a file without extension specified
          for (const ext of EXTENSIONS) {
            const fullPath = path.join(dirPath, exportedDir + ext);
            if (fs.existsSync(fullPath)) {
              referencedFiles.add(fullPath);
              break;
            }
          }
        }
      });
    });
  
  return referencedFiles;
};

// Main execution
console.log('Finding completely unused files...');
const allSourceFiles = findSourceFiles(SRC_DIR);
const referencedFiles = findReferencedFiles();

// Find completely unused files
const unusedFiles = allSourceFiles.filter(file => !referencedFiles.has(file));

console.log(`\nFound ${unusedFiles.length} completely unused files:`);
unusedFiles.forEach(file => {
  console.log(file);
});

console.log('\nThese files are not imported or used anywhere in the codebase and could be removed.');
console.log('IMPORTANT: Verify each file before removal to ensure it is truly unused.'); 