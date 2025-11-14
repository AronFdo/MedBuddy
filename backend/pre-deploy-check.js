#!/usr/bin/env node

/**
 * Pre-Deployment Check Script for MedBuddy Backend
 * Validates that all files and configurations are in order before building and deploying
 */

const fs = require('fs');
const path = require('path');

const CHECKMARK = '✓';
const CROSS = '✗';
const WARNING = '⚠';

let hasErrors = false;
let hasWarnings = false;

console.log('🔍 MedBuddy Backend - Pre-Deployment Check\n');
console.log('=' .repeat(60));

// Helper function to check if file exists
function checkFile(filePath, required = true, description = '') {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? CHECKMARK : (required ? CROSS : WARNING);
  
  if (!exists && required) {
    hasErrors = true;
    console.log(`${status} ${filePath} ${description || '(REQUIRED - MISSING)'}`);
    return false;
  } else if (!exists && !required) {
    hasWarnings = true;
    console.log(`${status} ${filePath} ${description || '(OPTIONAL - MISSING)'}`);
    return false;
  } else {
    console.log(`${status} ${filePath} ${description || '(found)'}`);
    return true;
  }
}

// Check file content for required strings
function checkFileContent(filePath, requiredStrings, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`${CROSS} ${filePath} - Cannot check content (file missing)`);
    hasErrors = true;
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let allFound = true;
  
  for (const str of requiredStrings) {
    if (!content.includes(str)) {
      console.log(`${CROSS} ${filePath} - Missing: "${str}"`);
      allFound = false;
      hasErrors = true;
    }
  }
  
  if (allFound) {
    console.log(`${CHECKMARK} ${filePath} ${description || '(content verified)'}`);
  }
  
  return allFound;
}

// Validate JSON file
function validateJSON(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    JSON.parse(content);
    console.log(`${CHECKMARK} ${filePath} (valid JSON)`);
    return true;
  } catch (error) {
    console.log(`${CROSS} ${filePath} (invalid JSON: ${error.message})`);
    hasErrors = true;
    return false;
  }
}

console.log('\n📁 Required Files:');
console.log('-'.repeat(60));

// Essential files
checkFile('Dockerfile', true, '(Docker configuration)');
checkFile('package.json', true, '(Node.js dependencies)');
checkFile('package-lock.json', true, '(Required for npm ci)');
checkFile('index.js', true, '(Main application entry point)');
checkFile('.dockerignore', false, '(Optimizes Docker build)');
checkFile('.gcloudignore', false, '(Optimizes Cloud upload)');

console.log('\n📂 Application Files:');
console.log('-'.repeat(60));

// API routes
checkFile('api/ai-chat.js', true, '(AI chat API route)');
checkFile('api/ocr.js', true, '(OCR API route)');
checkFile('api/serve-pdf.js', true, '(PDF serving API route)');
checkFile('supabaseClient.js', true, '(Supabase client configuration)');

console.log('\n⚙️  Configuration Files:');
console.log('-'.repeat(60));

checkFile('cloudbuild.yaml', false, '(Cloud Build configuration)');
checkFile('gcp-config.sh', false, '(GCP configuration helper)');

console.log('\n🔍 Content Validation:');
console.log('-'.repeat(60));

// Validate package.json
if (validateJSON('package.json')) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    // Check required dependencies
    const requiredDeps = ['express', '@supabase/supabase-js', 'dotenv'];
    const missingDeps = requiredDeps.filter(dep => !pkg.dependencies || !pkg.dependencies[dep]);
    
    if (missingDeps.length > 0) {
      console.log(`${CROSS} package.json - Missing dependencies: ${missingDeps.join(', ')}`);
      hasErrors = true;
    } else {
      console.log(`${CHECKMARK} package.json - All required dependencies present`);
    }
    
    // Check start script
    if (!pkg.scripts || !pkg.scripts.start) {
      console.log(`${CROSS} package.json - Missing "start" script`);
      hasErrors = true;
    } else {
      console.log(`${CHECKMARK} package.json - Start script: "${pkg.scripts.start}"`);
    }
    
    // Check Node version
    if (pkg.engines && pkg.engines.node) {
      console.log(`${CHECKMARK} package.json - Node version requirement: ${pkg.engines.node}`);
    }
  } catch (error) {
    console.log(`${CROSS} package.json - Error parsing: ${error.message}`);
    hasErrors = true;
  }
}

// Check Dockerfile content
if (checkFile('Dockerfile')) {
  checkFileContent('Dockerfile', 
    ['FROM node', 'WORKDIR', 'EXPOSE', 'CMD'],
    '(Dockerfile structure verified)'
  );
  
  // Check if it uses the correct Node version
  const dockerfileContent = fs.readFileSync(path.join(__dirname, 'Dockerfile'), 'utf8');
  if (!dockerfileContent.includes('node:22')) {
    console.log(`${WARNING} Dockerfile - Using non-Node 22 version (check compatibility)`);
    hasWarnings = true;
  } else {
    console.log(`${CHECKMARK} Dockerfile - Uses Node 22 (matches package.json requirement)`);
  }
  
  // Check if it runs as non-root
  if (!dockerfileContent.includes('USER nodejs') && !dockerfileContent.includes('USER ')) {
    console.log(`${WARNING} Dockerfile - Not running as non-root user (security recommendation)`);
    hasWarnings = true;
  } else {
    console.log(`${CHECKMARK} Dockerfile - Runs as non-root user (secure)`);
  }
}

// Check cloudbuild.yaml if it exists
if (fs.existsSync(path.join(__dirname, 'cloudbuild.yaml'))) {
  checkFileContent('cloudbuild.yaml',
    ['_PROJECT_ID', 'asia-south1', 'medbuddy-backend'],
    '(Cloud Build config verified)'
  );
  
  const cloudbuildContent = fs.readFileSync(path.join(__dirname, 'cloudbuild.yaml'), 'utf8');
  if (cloudbuildContent.includes('arctic-joy-455408-v6')) {
    console.log(`${CHECKMARK} cloudbuild.yaml - Project ID configured: arctic-joy-455408-v6`);
  } else {
    console.log(`${WARNING} cloudbuild.yaml - Project ID may not be set correctly`);
    hasWarnings = true;
  }
}

console.log('\n🌐 Environment Variables:');
console.log('-'.repeat(60));

// Check index.js for required env vars
if (checkFile('index.js')) {
  const indexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  
  if (indexContent.includes('SUPABASE_URL')) {
    console.log(`${CHECKMARK} index.js - Requires SUPABASE_URL (will be set in Cloud Run)`);
  }
  
  if (indexContent.includes('PORT')) {
    console.log(`${CHECKMARK} index.js - Uses PORT env var (Cloud Run compatible)`);
  }
  
  if (indexContent.includes('0.0.0.0')) {
    console.log(`${CHECKMARK} index.js - Listens on 0.0.0.0 (container-compatible)`);
  } else {
    console.log(`${WARNING} index.js - May not be listening on 0.0.0.0 (check for localhost)`);
    hasWarnings = true;
  }
}

// Check for required CLI tools
function checkCLITool(tool, command) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`${command} --version`, (error) => {
      resolve(!error);
    });
  });
}

async function checkTools() {
  console.log('\n🛠️  CLI Tools:');
  console.log('-'.repeat(60));
  
  const dockerCheck = await checkCLITool('docker', 'docker');
  const gcloudCheck = await checkCLITool('gcloud', 'gcloud');
  
  if (dockerCheck) {
    console.log(`${CHECKMARK} Docker CLI (available)`);
  } else {
    console.log(`${CROSS} Docker CLI (not found - install Docker)`);
    hasErrors = true;
  }
  
  if (gcloudCheck) {
    console.log(`${CHECKMARK} Google Cloud CLI (available)`);
  } else {
    console.log(`${CROSS} Google Cloud CLI (not found - install gcloud SDK)`);
    hasWarnings = true;
  }
}

console.log('\n📋 Deployment Checklist:');
console.log('-'.repeat(60));

const checklist = [
  { item: 'Dockerfile configured', status: fs.existsSync(path.join(__dirname, 'Dockerfile')) },
  { item: 'package-lock.json present', status: fs.existsSync(path.join(__dirname, 'package-lock.json')) },
  { item: 'All API routes exist', status: 
    fs.existsSync(path.join(__dirname, 'api/ai-chat.js')) &&
    fs.existsSync(path.join(__dirname, 'api/ocr.js')) &&
    fs.existsSync(path.join(__dirname, 'api/serve-pdf.js'))
  },
  { item: 'Cloud Build config ready', status: fs.existsSync(path.join(__dirname, 'cloudbuild.yaml')) },
];

checklist.forEach(({ item, status }) => {
  console.log(`${status ? CHECKMARK : CROSS} ${item}`);
  if (!status) hasWarnings = true;
});

// Main async function
(async () => {
  // Check CLI tools asynchronously
  await checkTools();

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Next Steps:');
  console.log('-'.repeat(60));

  if (hasErrors) {
    console.log(`\n❌ ERRORS FOUND - Please fix the issues above before deploying.\n`);
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`\n⚠️  WARNINGS FOUND - Review the warnings above, but deployment can proceed.\n`);
    console.log('To deploy:');
    console.log('  1. gcloud config set project arctic-joy-455408-v6');
    console.log('  2. gcloud run deploy medbuddy-backend --source . --region asia-south1 --platform managed --allow-unauthenticated');
    console.log('  3. Set environment variables in Cloud Run console or via CLI\n');
    process.exit(0);
  } else {
    console.log(`\n✅ ALL CHECKS PASSED - Ready to deploy!\n`);
    console.log('Deployment commands:');
    console.log('  1. Set project: gcloud config set project arctic-joy-455408-v6');
    console.log('  2. Enable APIs: gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com');
    console.log('  3. Deploy: gcloud run deploy medbuddy-backend --source . --region asia-south1 --platform managed --allow-unauthenticated');
    console.log('  4. Set env vars: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Cloud Run\n');
    process.exit(0);
  }
})();

