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
  /\/app\/(manifest|robots|sitemap)\.ts$/  // Next.js special files
];

// Utils
const getExportedSymbols = (content) => {
  const exportMatches = [];
  
  // Match named exports: export { X, Y }
  const namedExportRegex = /export\s*{([^}]*)}/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const exportedItems = match[1].split(',').map(item => 
      item.trim().split(' as ')[0].trim()
    );
    exportMatches.push(...exportedItems);
  }
  
  // Match direct exports: export const X = ... / export function Y(...) / export class Z ...
  const directExportRegex = /export\s+(const|let|var|function|class|type|interface|enum)\s+([a-zA-Z0-9_$]+)/g;
  while ((match = directExportRegex.exec(content)) !== null) {
    exportMatches.push(match[2]);
  }
  
  // Match default exports
  const defaultExportRegex = /export\s+default\s+(function|class|const|let|var)?\s*([a-zA-Z0-9_$]+)?/g;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    if (match[2]) {
      exportMatches.push('default: ' + match[2]);
    } else {
      exportMatches.push('default: anonymous');
    }
  }
  
  return exportMatches;
};

const findImportStatements = (content) => {
  const importRegex = /import\s+(?:{([^}]*)}|\*\s+as\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+))?\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1] ? match[1].split(',').map(item => item.trim()) : [];
    const namespaceImport = match[2];
    const defaultImport = match[3];
    const fromPath = match[4];
    
    imports.push({
      fromPath,
      namedImports: namedImports.filter(Boolean),
      namespaceImport: namespaceImport || null,
      defaultImport: defaultImport || null
    });
  }
  
  return imports;
};

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

// Main analysis
console.log('Analyzing code usage...');
const sourceFiles = findSourceFiles(SRC_DIR);
console.log(`Found ${sourceFiles.length} source files to analyze`);

// Build exports map
const exportsMap = new Map();
const importsMap = new Map();

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const exportedSymbols = getExportedSymbols(content);
  if (exportedSymbols.length > 0) {
    exportsMap.set(file, exportedSymbols);
  }
  
  const imports = findImportStatements(content);
  importsMap.set(file, imports);
}

// Analyze import usage
const importedFiles = new Set();
const usedSymbols = new Map(); // file -> Set of used exported symbols

for (const [file, imports] of importsMap.entries()) {
  for (const importInfo of imports) {
    const { fromPath, namedImports, namespaceImport, defaultImport } = importInfo;
    
    // Resolve the imported file path (simplified)
    let resolvedPath = null;
    
    // Check if it's a relative import
    if (fromPath.startsWith('.')) {
      const baseDir = path.dirname(file);
      // Try different extensions
      for (const ext of EXTENSIONS) {
        const candidate = path.resolve(baseDir, `${fromPath}${ext}`);
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
          break;
        }
        
        // Try with /index extension
        const indexCandidate = path.resolve(baseDir, `${fromPath}/index${ext}`);
        if (fs.existsSync(indexCandidate)) {
          resolvedPath = indexCandidate;
          break;
        }
      }
    } else if (fromPath.startsWith('@/')) {
      // Alias imports (@/...)
      const relativePath = fromPath.substring(2);
      for (const ext of EXTENSIONS) {
        const candidate = path.resolve(SRC_DIR, `${relativePath}${ext}`);
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
          break;
        }
        
        // Try with /index extension
        const indexCandidate = path.resolve(SRC_DIR, `${relativePath}/index${ext}`);
        if (fs.existsSync(indexCandidate)) {
          resolvedPath = indexCandidate;
          break;
        }
      }
    }
    
    if (resolvedPath) {
      importedFiles.add(resolvedPath);
      
      // Track which symbols are used
      if (!usedSymbols.has(resolvedPath)) {
        usedSymbols.set(resolvedPath, new Set());
      }
      
      if (defaultImport) {
        // Mark default export as used
        usedSymbols.get(resolvedPath).add('default: anonymous');
        usedSymbols.get(resolvedPath).add(`default: ${defaultImport}`);
      }
      
      if (namespaceImport) {
        // Conservatively assume all exports are used with namespace imports
        const symbols = exportsMap.get(resolvedPath) || [];
        symbols.forEach(symbol => {
          usedSymbols.get(resolvedPath).add(symbol);
        });
      }
      
      namedImports.forEach(namedImport => {
        usedSymbols.get(resolvedPath).add(namedImport.split(' as ')[0].trim());
      });
    }
  }
}

// Find files that are imported but their exports might not be used
console.log('\n--- Files with unused exports ---');
for (const [file, exportedSymbols] of exportsMap.entries()) {
  if (!importedFiles.has(file)) {
    // Skip files that aren't imported at all
    continue;
  }
  
  const usedExports = usedSymbols.get(file) || new Set();
  const unusedExports = exportedSymbols.filter(symbol => !usedExports.has(symbol));
  
  if (unusedExports.length > 0 && exportedSymbols.length !== unusedExports.length) {
    console.log(`\n${file}`);
    console.log('  Used exports:', [...usedExports].join(', '));
    console.log('  Unused exports:', unusedExports.join(', '));
  }
}

// Find circular dependencies
console.log('\n--- Circular Dependencies ---');
const dependencyGraph = new Map();

// Build the dependency graph
for (const [file, imports] of importsMap.entries()) {
  dependencyGraph.set(file, new Set());
  
  for (const importInfo of imports) {
    const { fromPath } = importInfo;
    
    // Resolve the imported file path (simplified, reusing logic from above)
    let resolvedPath = null;
    
    // Check if it's a relative import
    if (fromPath.startsWith('.')) {
      const baseDir = path.dirname(file);
      // Try different extensions
      for (const ext of EXTENSIONS) {
        const candidate = path.resolve(baseDir, `${fromPath}${ext}`);
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
          break;
        }
        
        // Try with /index extension
        const indexCandidate = path.resolve(baseDir, `${fromPath}/index${ext}`);
        if (fs.existsSync(indexCandidate)) {
          resolvedPath = indexCandidate;
          break;
        }
      }
    } else if (fromPath.startsWith('@/')) {
      // Alias imports (@/...)
      const relativePath = fromPath.substring(2);
      for (const ext of EXTENSIONS) {
        const candidate = path.resolve(SRC_DIR, `${relativePath}${ext}`);
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
          break;
        }
        
        // Try with /index extension
        const indexCandidate = path.resolve(SRC_DIR, `${relativePath}/index${ext}`);
        if (fs.existsSync(indexCandidate)) {
          resolvedPath = indexCandidate;
          break;
        }
      }
    }
    
    if (resolvedPath && resolvedPath !== file) {
      dependencyGraph.get(file).add(resolvedPath);
    }
  }
}

// Find circular dependencies using DFS
const findCircularDependencies = () => {
  const visited = new Set();
  const recStack = new Set();
  const circularDeps = new Set();
  
  const dfs = (node, path = []) => {
    if (recStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      circularDeps.add(cycle.join(' -> '));
      return;
    }
    
    if (visited.has(node)) {
      return;
    }
    
    visited.add(node);
    recStack.add(node);
    
    const dependencies = dependencyGraph.get(node) || new Set();
    for (const dep of dependencies) {
      dfs(dep, [...path, node]);
    }
    
    recStack.delete(node);
  };
  
  for (const node of dependencyGraph.keys()) {
    dfs(node);
  }
  
  return circularDeps;
};

const circularDeps = findCircularDependencies();
if (circularDeps.size > 0) {
  console.log('Found circular dependencies:');
  for (const cycle of circularDeps) {
    console.log(cycle);
  }
} else {
  console.log('No circular dependencies found.');
}

// Find files that are not imported anywhere (and not excluded by patterns)
console.log('\n--- Files not imported anywhere ---');
for (const file of sourceFiles) {
  if (!importedFiles.has(file) && exportsMap.has(file)) {
    // Check if it's a page component or other special Next.js file
    if (file.includes('/page.') || file.includes('/layout.') || 
        file.includes('/error.') || file.includes('/loading.') ||
        file.includes('/not-found.')) {
      continue;
    }
    
    console.log(`${file}`);
    console.log('  Exports:', exportsMap.get(file).join(', '));
  }
}

// Find redundant wrappers - files that just re-export from other files
console.log('\n--- Potential Redundant Wrappers ---');
for (const [file, imports] of importsMap.entries()) {
  const content = fs.readFileSync(file, 'utf8');
  const isSimpleReexport = content.trim().split('\n').filter(line => !line.trim().startsWith('//') && line.trim()).every(
    line => line.startsWith('import ') || line.startsWith('export ') || line.trim() === ''
  );
  
  if (isSimpleReexport && content.includes('export * from')) {
    console.log(`${file} - Simple re-export file`);
  }
}

// Find files with very similar content
console.log('\n--- Potentially Similar Files ---');
const fileContentHashes = new Map();

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Simple "hash" based on content length and first/last characters
  const contentLength = content.length;
  const firstChars = content.substring(0, 100);
  const lastChars = content.substring(Math.max(0, contentLength - 100));
  
  const simpleHash = `${contentLength}:${firstChars}:${lastChars}`;
  
  if (!fileContentHashes.has(simpleHash)) {
    fileContentHashes.set(simpleHash, []);
  }
  fileContentHashes.get(simpleHash).push(file);
}

for (const [hash, files] of fileContentHashes.entries()) {
  if (files.length > 1) {
    console.log(`Potentially similar files:`);
    files.forEach(file => console.log(`  ${file}`));
  }
}

console.log('\nAnalysis complete. Verify any suggested changes before removal.'); 