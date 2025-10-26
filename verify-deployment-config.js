#!/usr/bin/env node

/**
 * Verification script to check deployment configuration
 * 
 * Usage: node verify-deployment-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verifying Deployment Configuration...\n');

let allGood = true;
const warnings = [];
const errors = [];

// Check if required files exist
const requiredFiles = [
  'client/netlify.toml',
  'client/_redirects',
  'vercel.json',
  'server/index.ts',
  'server/routes.ts',
  'DEPLOYMENT.md',
  'DEPLOYMENT-CHECKLIST.md',
  'update-urls.js'
];

console.log('📁 Checking required files...\n');

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    errors.push(`Missing file: ${file}`);
    allGood = false;
  }
});

// Check netlify.toml configuration
console.log('\n📝 Checking netlify.toml...\n');

try {
  const netlifyToml = fs.readFileSync(path.join(__dirname, 'client', 'netlify.toml'), 'utf8');
  
  if (netlifyToml.includes('your-backend-app.vercel.app')) {
    console.log('⚠️  Backend URL not updated (still using placeholder)');
    warnings.push('Update backend URL in client/netlify.toml');
  } else if (netlifyToml.match(/https:\/\/.*\.vercel\.app/)) {
    console.log('✅ Backend URL appears to be configured');
  } else {
    console.log('⚠️  Backend URL format looks unusual');
    warnings.push('Verify backend URL in client/netlify.toml');
  }
  
  if (netlifyToml.includes('command = "npm run build"')) {
    console.log('✅ Build command configured');
  } else {
    console.log('❌ Build command not found');
    errors.push('Build command not configured in netlify.toml');
    allGood = false;
  }
  
  if (netlifyToml.includes('publish = "dist"')) {
    console.log('✅ Publish directory configured');
  } else {
    console.log('❌ Publish directory not found');
    errors.push('Publish directory not configured in netlify.toml');
    allGood = false;
  }
} catch (error) {
  console.log('❌ Error reading netlify.toml:', error.message);
  errors.push('Cannot read netlify.toml');
  allGood = false;
}

// Check _redirects
console.log('\n📝 Checking _redirects...\n');

try {
  const redirects = fs.readFileSync(path.join(__dirname, 'client', '_redirects'), 'utf8');
  
  if (redirects.includes('your-backend-app.vercel.app')) {
    console.log('⚠️  Backend URL not updated (still using placeholder)');
    warnings.push('Update backend URL in client/_redirects');
  } else if (redirects.match(/https:\/\/.*\.vercel\.app/)) {
    console.log('✅ Backend URL appears to be configured');
  } else {
    console.log('⚠️  Backend URL format looks unusual');
    warnings.push('Verify backend URL in client/_redirects');
  }
  
  if (redirects.includes('/api/*') && redirects.includes('/uploads/*')) {
    console.log('✅ API and uploads redirects configured');
  } else {
    console.log('❌ Missing API or uploads redirects');
    errors.push('Incomplete redirects in _redirects file');
    allGood = false;
  }
} catch (error) {
  console.log('❌ Error reading _redirects:', error.message);
  errors.push('Cannot read _redirects');
  allGood = false;
}

// Check vercel.json
console.log('\n📝 Checking vercel.json...\n');

try {
  const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));
  
  if (vercelJson.builds && vercelJson.builds.length > 0) {
    console.log('✅ Build configuration found');
  } else {
    console.log('❌ No build configuration');
    errors.push('Build configuration missing in vercel.json');
    allGood = false;
  }
  
  if (vercelJson.routes && vercelJson.routes.length > 0) {
    console.log('✅ Routes configured');
  } else {
    console.log('❌ No routes configured');
    errors.push('Routes missing in vercel.json');
    allGood = false;
  }
  
  if (vercelJson.headers && vercelJson.headers.length > 0) {
    console.log('✅ CORS headers configured');
    
    const corsHeader = vercelJson.headers[0];
    const originHeader = corsHeader.headers.find(h => h.key === 'Access-Control-Allow-Origin');
    
    if (originHeader && originHeader.value.includes('your-frontend-app.netlify.app')) {
      console.log('⚠️  Frontend URL not updated (still using placeholder)');
      warnings.push('Update frontend URL in vercel.json CORS headers');
    } else if (originHeader && originHeader.value.match(/https:\/\/.*\.netlify\.app/)) {
      console.log('✅ Frontend URL appears to be configured');
    }
  } else {
    console.log('⚠️  No CORS headers configured');
    warnings.push('CORS headers not configured in vercel.json');
  }
} catch (error) {
  console.log('❌ Error reading vercel.json:', error.message);
  errors.push('Cannot read or parse vercel.json');
  allGood = false;
}

// Check if CORS is imported in server/index.ts
console.log('\n📝 Checking server CORS configuration...\n');

try {
  const serverIndex = fs.readFileSync(path.join(__dirname, 'server', 'index.ts'), 'utf8');
  
  if (serverIndex.includes("import cors from")) {
    console.log('✅ CORS imported');
  } else {
    console.log('❌ CORS not imported');
    errors.push('CORS not imported in server/index.ts');
    allGood = false;
  }
  
  if (serverIndex.includes('app.use(cors(')) {
    console.log('✅ CORS middleware configured');
  } else {
    console.log('❌ CORS middleware not applied');
    errors.push('CORS middleware not applied in server/index.ts');
    allGood = false;
  }
  
  if (serverIndex.includes('FRONTEND_URL')) {
    console.log('✅ Frontend URL configuration found');
  } else {
    console.log('⚠️  Frontend URL not used in CORS config');
    warnings.push('Consider using FRONTEND_URL env var for CORS origin');
  }
} catch (error) {
  console.log('❌ Error reading server/index.ts:', error.message);
  errors.push('Cannot read server/index.ts');
  allGood = false;
}

// Check session configuration
console.log('\n📝 Checking session configuration...\n');

try {
  const serverRoutes = fs.readFileSync(path.join(__dirname, 'server', 'routes.ts'), 'utf8');
  
  if (serverRoutes.includes("sameSite: process.env.NODE_ENV === 'production' ? 'none'")) {
    console.log('✅ Session sameSite configured for production');
  } else {
    console.log('⚠️  Session sameSite might not be configured for cross-site');
    warnings.push('Verify session sameSite configuration in server/routes.ts');
  }
  
  if (serverRoutes.includes("secure: process.env.NODE_ENV === 'production'")) {
    console.log('✅ Secure cookies enabled for production');
  } else {
    console.log('⚠️  Secure cookies configuration not found');
    warnings.push('Verify secure cookie configuration in server/routes.ts');
  }
} catch (error) {
  console.log('❌ Error reading server/routes.ts:', error.message);
  errors.push('Cannot read server/routes.ts');
  allGood = false;
}

// Check package.json scripts
console.log('\n📝 Checking deployment scripts...\n');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts['update-urls']) {
    console.log('✅ update-urls script found');
  } else {
    console.log('⚠️  update-urls script not found');
    warnings.push('Consider adding update-urls script to package.json');
  }
  
  if (packageJson.scripts && (packageJson.scripts['deploy:backend'] || packageJson.scripts['deploy:frontend'])) {
    console.log('✅ Deployment scripts found');
  } else {
    console.log('⚠️  Deployment scripts not found');
    warnings.push('Consider adding deployment scripts to package.json');
  }
} catch (error) {
  console.log('⚠️  Cannot check package.json scripts:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 VERIFICATION SUMMARY\n');

if (errors.length > 0) {
  console.log('❌ ERRORS FOUND:\n');
  errors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach((warning, index) => {
    console.log(`   ${index + 1}. ${warning}`);
  });
  console.log('');
}

if (allGood && warnings.length === 0) {
  console.log('✅ All checks passed! Configuration looks good.\n');
  console.log('📋 Next steps:');
  console.log('   1. Update URLs using: npm run update-urls');
  console.log('   2. Follow the deployment guide: QUICK-START-DEPLOYMENT.md');
  console.log('   3. Deploy backend to Vercel');
  console.log('   4. Deploy frontend to Netlify\n');
} else if (allGood) {
  console.log('✅ Core configuration is valid.\n');
  console.log('⚠️  Please address the warnings above before deploying.\n');
  console.log('💡 TIP: Run npm run update-urls to fix URL placeholders.\n');
} else {
  console.log('❌ Configuration has errors that must be fixed before deployment.\n');
  console.log('📚 See DEPLOYMENT.md for detailed setup instructions.\n');
}

console.log('='.repeat(60) + '\n');

process.exit(allGood ? 0 : 1);

