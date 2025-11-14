#!/usr/bin/env node

/**
 * Version Check Script
 * Ensures developers are using the correct Node.js and npm versions
 * Run automatically via npm preinstall hook
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHECKMARK = '✓';
const CROSS = '✗';
const WARNING = '⚠';

let hasErrors = false;

// Read package.json to get engine requirements
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredNode = packageJson.engines?.node || '>=22.0.0';
const requiredNpm = packageJson.engines?.npm || '>=10.0.0';

console.log('\n🔍 Checking Node.js and npm versions...\n');

// Get current versions
let currentNode, currentNpm;

try {
  currentNode = execSync('node --version', { encoding: 'utf8' }).trim();
  currentNpm = execSync('npm --version', { encoding: 'utf8' }).trim();
} catch (error) {
  console.error(`${CROSS} Failed to check versions: ${error.message}`);
  process.exit(1);
}

// Parse version strings
const parseVersion = (version) => {
  // Remove 'v' prefix if present
  const clean = version.replace(/^v/, '');
  const parts = clean.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    full: clean
  };
};

// Check if version meets requirement
const checkVersion = (current, requirement) => {
  const currentVer = parseVersion(current);
  
  // Handle >= requirement
  if (requirement.startsWith('>=')) {
    const requiredVer = parseVersion(requirement.substring(2));
    
    if (currentVer.major > requiredVer.major) return true;
    if (currentVer.major < requiredVer.major) return false;
    if (currentVer.minor > requiredVer.minor) return true;
    if (currentVer.minor < requiredVer.minor) return false;
    return currentVer.patch >= requiredVer.patch;
  }
  
  // Handle exact version (e.g., "22")
  if (/^\d+$/.test(requirement)) {
    return currentVer.major === parseInt(requirement);
  }
  
  // Default: assume compatible if we can't parse
  return true;
};

// Check Node.js version
const nodeOk = checkVersion(currentNode, requiredNode);
if (nodeOk) {
  console.log(`${CHECKMARK} Node.js version: ${currentNode} (required: ${requiredNode})`);
} else {
  console.log(`${CROSS} Node.js version: ${currentNode} (required: ${requiredNode})`);
  console.log(`   Please upgrade Node.js to meet the requirement.`);
  console.log(`   You can use nvm: nvm install 22 && nvm use 22`);
  hasErrors = true;
}

// Check npm version
const npmOk = checkVersion(currentNpm, requiredNpm);
if (npmOk) {
  console.log(`${CHECKMARK} npm version: ${currentNpm} (required: ${requiredNpm})`);
} else {
  console.log(`${CROSS} npm version: ${currentNpm} (required: ${requiredNpm})`);
  console.log(`   Please upgrade npm: npm install -g npm@latest`);
  hasErrors = true;
}

console.log('');

if (hasErrors) {
  console.log('❌ Version check failed. Please update your Node.js and/or npm version.\n');
  process.exit(1);
} else {
  console.log('✅ All version checks passed!\n');
  process.exit(0);
}




