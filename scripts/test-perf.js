const { spawn, execSync } = require('child_process');
const { performance } = require('perf_hooks');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test paths to check - we'll discover more dynamically
const INITIAL_PATHS = [
  '/',
  '/microsoft',
  '/microsoft/global-building-footprints',
  '/microsoft/global-building-footprints/README.md'
];

async function measurePageLoad(path, baseUrl = 'http://localhost:3000') {
  const start = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`);
    const html = await response.text();
    const loadTime = performance.now() - start;
    
    // Extract links from the HTML to discover more pages
    const links = html.match(/href="([^"]+)"/g) || [];
    const newPaths = links
      .map(link => link.match(/href="([^"]+)"/)[1])
      .filter(link => 
        link.startsWith('/') && 
        !link.startsWith('/_next') && 
        !link.includes('?') &&
        !link.includes('#')
      );
    
    return {
      path,
      loadTime,
      status: response.status,
      newPaths: [...new Set(newPaths)] // Deduplicate
    };
  } catch (e) {
    console.error(`Failed to load ${path}:`, e.message);
    return {
      path,
      loadTime: performance.now() - start,
      status: 'error',
      error: e.message,
      newPaths: []
    };
  }
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('\n=== Build Time Test ===');
    
    // Kill any running dev server
    try {
      execSync('pkill -f "next dev"');
    } catch (e) {
      // Ignore if no process found
    }

    // Start timing
    const start = performance.now();
    
    console.log('Starting dev server...');
    const child = spawn('npm', ['run', 'dev'], { 
      stdio: ['inherit', 'pipe', 'inherit']
    });

    let output = '';
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
      
      // If we see the ready message, we're done
      if (chunk.includes('Ready in')) {
        const buildTime = performance.now() - start;
        const readyMatch = output.match(/Ready in (\d+)ms/);
        const readyTime = readyMatch ? parseInt(readyMatch[1]) : null;
        
        // Return the server process and timing info
        resolve({ child, buildTime, readyTime });
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function crawlSite() {
  console.log('\n=== Page Load Tests ===');
  
  const visited = new Set();
  const toVisit = [...INITIAL_PATHS];
  const pageMetrics = [];

  while (toVisit.length > 0) {
    const path = toVisit.shift();
    if (visited.has(path)) continue;
    
    console.log(`Testing ${path}...`);
    const result = await measurePageLoad(path);
    pageMetrics.push({
      path: result.path,
      loadTime: result.loadTime,
      status: result.status
    });
    visited.add(path);

    // Add new discovered paths to visit
    for (const newPath of result.newPaths) {
      if (!visited.has(newPath)) {
        toVisit.push(newPath);
      }
    }
  }

  return pageMetrics;
}

// Run the performance tests
async function runTests() {
  console.log('Running performance tests...');
  const results = {
    timestamp: new Date().toISOString(),
    metrics: {
      pages: []
    }
  };
  
  try {
    // Start the dev server and get build metrics
    const { child, buildTime, readyTime } = await startDevServer();
    results.metrics.build = { buildTime, readyTime };

    // Wait a moment for the server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Crawl and test pages
    results.metrics.pages = await crawlSite();

    // Kill the server
    child.kill();
  } catch (e) {
    console.error('Test failed:', e);
  }
  
  // Kill any remaining dev server
  try {
    execSync('pkill -f "next dev"');
  } catch (e) {
    // Ignore if no process found
  }
  
  console.log('\nTest Results:', JSON.stringify(results, null, 2));
  console.log('\nTests completed!');
}

runTests(); 