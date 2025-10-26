#!/usr/bin/env node

/**
 * Helper script to update deployment URLs in configuration files
 * 
 * Usage:
 *   node update-urls.js --backend=https://your-backend.vercel.app --frontend=https://your-app.netlify.app
 * 
 * Or run interactively:
 *   node update-urls.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
let backendUrl = null;
let frontendUrl = null;

args.forEach(arg => {
  if (arg.startsWith('--backend=')) {
    backendUrl = arg.split('=')[1];
  } else if (arg.startsWith('--frontend=')) {
    frontendUrl = arg.split('=')[1];
  }
});

// Interactive prompt
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚀 Reelish Deployment URL Updater\n');
  console.log('This script will update all deployment configuration files with your URLs.\n');

  // Get URLs if not provided via command line
  if (!backendUrl) {
    backendUrl = await question('Enter your Vercel backend URL (e.g., https://your-backend.vercel.app): ');
  }

  if (!frontendUrl) {
    frontendUrl = await question('Enter your Netlify frontend URL (e.g., https://your-app.netlify.app): ');
  }

  // Validate URLs
  backendUrl = backendUrl.trim();
  frontendUrl = frontendUrl.trim();

  if (!backendUrl.startsWith('http')) {
    console.error('❌ Error: Backend URL must start with http:// or https://');
    process.exit(1);
  }

  if (!frontendUrl.startsWith('http')) {
    console.error('❌ Error: Frontend URL must start with http:// or https://');
    process.exit(1);
  }

  console.log('\n📝 Updating configuration files...\n');

  // Update netlify.toml
  try {
    const netlifyTomlPath = path.join(__dirname, 'client', 'netlify.toml');
    let netlifyToml = fs.readFileSync(netlifyTomlPath, 'utf8');
    
    netlifyToml = netlifyToml.replace(
      /to = "https:\/\/.*?\.vercel\.app\/api\/:splat"/g,
      `to = "${backendUrl}/api/:splat"`
    );
    
    netlifyToml = netlifyToml.replace(
      /to = "https:\/\/.*?\.vercel\.app\/uploads\/:splat"/g,
      `to = "${backendUrl}/uploads/:splat"`
    );
    
    fs.writeFileSync(netlifyTomlPath, netlifyToml);
    console.log('✅ Updated client/netlify.toml');
  } catch (error) {
    console.error('❌ Error updating netlify.toml:', error.message);
  }

  // Update _redirects
  try {
    const redirectsPath = path.join(__dirname, 'client', '_redirects');
    let redirects = fs.readFileSync(redirectsPath, 'utf8');
    
    redirects = redirects.replace(
      /https:\/\/.*?\.vercel\.app\/api\/:splat/g,
      `${backendUrl}/api/:splat`
    );
    
    redirects = redirects.replace(
      /https:\/\/.*?\.vercel\.app\/uploads\/:splat/g,
      `${backendUrl}/uploads/:splat`
    );
    
    fs.writeFileSync(redirectsPath, redirects);
    console.log('✅ Updated client/_redirects');
  } catch (error) {
    console.error('❌ Error updating _redirects:', error.message);
  }

  // Update vercel.json
  try {
    const vercelJsonPath = path.join(__dirname, 'vercel.json');
    let vercelJson = fs.readFileSync(vercelJsonPath, 'utf8');
    
    vercelJson = vercelJson.replace(
      /"value": "https:\/\/.*?\.netlify\.app"/g,
      `"value": "${frontendUrl}"`
    );
    
    fs.writeFileSync(vercelJsonPath, vercelJson);
    console.log('✅ Updated vercel.json');
  } catch (error) {
    console.error('❌ Error updating vercel.json:', error.message);
  }

  // Create .env.production for client
  try {
    const envProductionPath = path.join(__dirname, 'client', '.env.production');
    const envContent = `# Production environment variables\nVITE_API_URL=${backendUrl}\n`;
    fs.writeFileSync(envProductionPath, envContent);
    console.log('✅ Created client/.env.production');
  } catch (error) {
    console.error('❌ Error creating .env.production:', error.message);
  }

  console.log('\n✅ All configuration files updated successfully!\n');
  console.log('📋 Next steps:');
  console.log('1. Set environment variables in Vercel:');
  console.log(`   FRONTEND_URL=${frontendUrl}`);
  console.log('   DATABASE_URL=your_database_url');
  console.log('   SESSION_SECRET=your_session_secret');
  console.log('   NODE_ENV=production\n');
  console.log('2. Set environment variables in Netlify:');
  console.log(`   VITE_API_URL=${backendUrl}\n`);
  console.log('3. Deploy your backend to Vercel');
  console.log('4. Deploy your frontend to Netlify\n');
  console.log('📚 See DEPLOYMENT.md for detailed instructions.');

  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});

