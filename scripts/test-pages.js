const { spawn } = require('child_process');
const { readdir } = require('fs/promises');
const { join } = require('path');

// Test configuration
const TEST_CONFIG = {
  account: {
    id: 'test-account',
    name: 'Test User'
  },
  repositories: [
    { id: 'repo1', title: 'Repository 1' },
    { id: 'repo2', title: 'Repository 2' }
  ],
  // Test paths for [...path] routes
  paths: ['README.md', 'docs/index.md']
};

// Function to find all page.tsx files
async function findPages(dir) {
  const pages = [];
  
  async function scan(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.name === 'page.tsx') {
        // Store relative path for cleaner output
        const relativePath = fullPath.split('src/app/')[1];
        pages.push({ file: relativePath });
      }
    }
  }
  
  await scan(dir);
  return pages;
}

// Helper to get human-readable route description
function getRouteDescription(testPath) {
  if (!testPath) return 'Home page';
  const parts = testPath.split('/');
  
  if (parts.length === 1) {
    return `Account page for ${TEST_CONFIG.account.name}`;
  }
  
  if (parts.length === 2) {
    const repo = TEST_CONFIG.repositories.find(r => r.id === parts[1]);
    return repo ? `Repository page for ${repo.title}` : 'Unknown repository';
  }
  
  return `Object browser for ${parts.slice(2).join('/')}`;
}

// Function to start dev server and wait for ready
function startDevServer() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const server = spawn('npm', ['run', 'dev'], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    server.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // Next.js is ready when it shows the localhost URL
      if (chunk.includes('http://localhost')) {
        const port = chunk.match(/localhost:(\d+)/)[1];
        const buildTime = Date.now() - startTime;
        resolve({ server, buildTime, port });
      }
    });

    server.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      server.kill();
      reject(new Error('Dev server startup timed out'));
    }, 30000);

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Dev server exited with code ${code}\nOutput: ${output}`));
      }
    });
  });
}

// Function to discover real repositories from homepage
async function discoverRepositories(port) {
  const response = await fetch(`http://localhost:${port}`);
  const html = await response.text();
  
  // Match paths between quotes in hrefs, preserving all slashes
  const repoRegex = /href="(\/[^"]*)"(?![^<>]*(?:css|js|ico|webmanifest|_next|favicon|repositories))/g;
  const repos = new Set();
  
  let match;
  while ((match = repoRegex.exec(html)) !== null) {
    const path = match[1].substring(1); // Remove leading slash
    // Only include paths that look like org/repo
    if (path.split('/').length === 2) {
      repos.add(path);
    }
  }
  
  return Array.from(repos);
}

// Function to test a single page route
async function testPage(port, path, description) {
  const url = `http://localhost:${port}/${path}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const loadTime = Date.now() - startTime;
    
    return {
      status: response.status,
      loadTime,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      loadTime: Date.now() - startTime,
      ok: false,
      error: error.message
    };
  }
}

async function main() {
  try {
    // Find all page.tsx files
    const appDir = join(process.cwd(), 'src', 'app');
    const pages = await findPages(appDir);
    
    console.log('Found page templates:');
    pages.forEach(page => console.log(`- ${page.file}`));
    
    // Start dev server and measure startup time
    console.log('\nStarting dev server...');
    const { server, buildTime, port } = await startDevServer();
    console.log(`Dev server ready in ${buildTime}ms`);

    // Give it a moment to fully stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Discover real repositories
    console.log('\nDiscovering repositories...');
    const repositories = await discoverRepositories(port);
    console.log(`Found ${repositories.length} repositories:`);
    repositories.forEach(repo => console.log(`- /${repo}`));

    // Test pages
    console.log('\nTesting pages:');
    
    // Test home page
    const homeResult = await testPage(port, '', 'Home page');
    console.log(`\n${homeResult.ok ? '✓' : '✗'} Home page`);
    console.log(`  Path: /`);
    console.log(`  Status: ${homeResult.status}`);
    console.log(`  Load time: ${homeResult.loadTime}ms`);

    // Test each repository page
    for (const repo of repositories) {
      const [accountId, repoId] = repo.split('/');
      
      // Test account page
      const accountResult = await testPage(port, accountId, `Account page for ${accountId}`);
      console.log(`\n${accountResult.ok ? '✓' : '✗'} Account page for ${accountId}`);
      console.log(`  Path: /${accountId}`);
      console.log(`  Status: ${accountResult.status}`);
      console.log(`  Load time: ${accountResult.loadTime}ms`);

      // Test repository page
      const repoResult = await testPage(port, repo, `Repository page for ${repoId}`);
      console.log(`\n${repoResult.ok ? '✓' : '✗'} Repository page for ${repoId}`);
      console.log(`  Path: /${repo}`);
      console.log(`  Status: ${repoResult.status}`);
      console.log(`  Load time: ${repoResult.loadTime}ms`);

      // Test some common paths in the repository
      const paths = ['README.md', 'LICENSE', 'docs/index.md'];
      for (const path of paths) {
        const fullPath = `${repo}/${path}`;
        const result = await testPage(port, fullPath, `Object browser for ${path}`);
        console.log(`\n${result.ok ? '✓' : '✗'} Object browser for ${path}`);
        console.log(`  Path: /${fullPath}`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Load time: ${result.loadTime}ms`);
      }
    }

    // Clean shutdown
    console.log('\nShutting down dev server...');
    server.kill();
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 