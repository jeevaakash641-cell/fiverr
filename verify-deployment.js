/**
 * Deployment Verification Script
 * Run this script to verify your deployment is working correctly
 * 
 * Usage: node verify-deployment.js <frontend-url> <backend-url>
 * Example: node verify-deployment.js https://my-app.vercel.app https://my-backend.onrender.com
 */

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        resolve({
          statusCode: res.statusCode,
          data: data,
          responseTime: endTime - startTime,
          headers: res.headers
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyBackend(backendUrl) {
  log('\n🔍 Verifying Backend...', 'cyan');
  
  try {
    // Test health endpoint
    log('  Testing /health endpoint...', 'blue');
    const healthResponse = await makeRequest(`${backendUrl}/health`);
    
    if (healthResponse.statusCode === 200) {
      log(`  ✅ Health check passed (${healthResponse.responseTime}ms)`, 'green');
      const healthData = JSON.parse(healthResponse.data);
      log(`     Status: ${healthData.status}`, 'green');
    } else {
      log(`  ❌ Health check failed (Status: ${healthResponse.statusCode})`, 'red');
      return false;
    }
    
    // Test root endpoint
    log('  Testing / endpoint...', 'blue');
    const rootResponse = await makeRequest(backendUrl);
    
    if (rootResponse.statusCode === 200) {
      log(`  ✅ Root endpoint passed (${rootResponse.responseTime}ms)`, 'green');
      const rootData = JSON.parse(rootResponse.data);
      log(`     API Name: ${rootData.name}`, 'green');
      log(`     Version: ${rootData.version}`, 'green');
    } else {
      log(`  ❌ Root endpoint failed (Status: ${rootResponse.statusCode})`, 'red');
      return false;
    }
    
    // Check CORS headers
    log('  Checking CORS configuration...', 'blue');
    if (rootResponse.headers['access-control-allow-origin']) {
      log(`  ✅ CORS enabled`, 'green');
    } else {
      log(`  ⚠️  CORS headers not found (may need configuration)`, 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`  ❌ Backend verification failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyFrontend(frontendUrl) {
  log('\n🔍 Verifying Frontend...', 'cyan');
  
  try {
    log('  Testing frontend URL...', 'blue');
    const response = await makeRequest(frontendUrl);
    
    if (response.statusCode === 200) {
      log(`  ✅ Frontend accessible (${response.responseTime}ms)`, 'green');
      
      // Check if it's HTML
      if (response.headers['content-type']?.includes('text/html')) {
        log(`  ✅ HTML content detected`, 'green');
      }
      
      // Check for React app indicators
      if (response.data.includes('root') || response.data.includes('React')) {
        log(`  ✅ React app detected`, 'green');
      }
      
      return true;
    } else {
      log(`  ❌ Frontend check failed (Status: ${response.statusCode})`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ Frontend verification failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyConnection(frontendUrl, backendUrl) {
  log('\n🔍 Verifying Frontend-Backend Connection...', 'cyan');
  log('  Note: This requires manual testing in browser', 'yellow');
  log(`  1. Open: ${frontendUrl}`, 'blue');
  log(`  2. Open browser console (F12)`, 'blue');
  log(`  3. Check for API calls to: ${backendUrl}`, 'blue');
  log(`  4. Verify no CORS errors`, 'blue');
}

function printSummary(backendOk, frontendOk) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 DEPLOYMENT VERIFICATION SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\nBackend Status: ${backendOk ? '✅ PASSED' : '❌ FAILED'}`, backendOk ? 'green' : 'red');
  log(`Frontend Status: ${frontendOk ? '✅ PASSED' : '❌ FAILED'}`, frontendOk ? 'green' : 'red');
  
  if (backendOk && frontendOk) {
    log('\n🎉 All checks passed! Your deployment looks good!', 'green');
    log('\n📝 Next Steps:', 'cyan');
    log('  1. Test user registration and login', 'blue');
    log('  2. Test AI chat functionality', 'blue');
    log('  3. Test quiz generation', 'blue');
    log('  4. Test video/book features', 'blue');
    log('  5. Check mobile responsiveness', 'blue');
  } else {
    log('\n⚠️  Some checks failed. Please review the errors above.', 'yellow');
    log('\n🔧 Troubleshooting:', 'cyan');
    if (!backendOk) {
      log('  Backend Issues:', 'red');
      log('    - Check Render logs for errors', 'blue');
      log('    - Verify environment variables are set', 'blue');
      log('    - Check AWS credentials', 'blue');
      log('    - Ensure backend is deployed and running', 'blue');
    }
    if (!frontendOk) {
      log('  Frontend Issues:', 'red');
      log('    - Check Vercel build logs', 'blue');
      log('    - Verify VITE_API_URL is set correctly', 'blue');
      log('    - Check for build errors', 'blue');
      log('    - Ensure frontend is deployed', 'blue');
    }
  }
  
  log('\n' + '='.repeat(60) + '\n', 'cyan');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    log('❌ Error: Missing arguments', 'red');
    log('\nUsage: node verify-deployment.js <frontend-url> <backend-url>', 'yellow');
    log('\nExample:', 'cyan');
    log('  node verify-deployment.js https://my-app.vercel.app https://my-backend.onrender.com', 'blue');
    process.exit(1);
  }
  
  const [frontendUrl, backendUrl] = args;
  
  log('🚀 AI-Bharat Deployment Verification', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Frontend URL: ${frontendUrl}`, 'blue');
  log(`Backend URL:  ${backendUrl}`, 'blue');
  
  const backendOk = await verifyBackend(backendUrl);
  const frontendOk = await verifyFrontend(frontendUrl);
  
  await verifyConnection(frontendUrl, backendUrl);
  
  printSummary(backendOk, frontendOk);
  
  process.exit(backendOk && frontendOk ? 0 : 1);
}

main();
