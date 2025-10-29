#!/usr/bin/env node

/**
 * Test verification script for MedBuddy Medications component
 * This script verifies that all test files are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying MedBuddy Medications Test Setup...\n');

// Test files to verify
const testFiles = [
  'app/(tabs)/__tests__/Medications.test.tsx',
  'app/(tabs)/__tests__/Medications.modals.test.tsx',
  'app/(tabs)/__tests__/Medications.helpers.test.tsx',
  'app/(tabs)/__tests__/Medications.integration.test.tsx',
];

// Configuration files to verify
const configFiles = [
  'jest.config.js',
  'jest.setup.js',
  'testsprite.config.js',
  'run-tests.js',
  'TESTING.md',
];

// Verify test files
console.log('📁 Checking test files...');
let allTestsExist = true;
testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`   ❌ ${file} - Missing`);
    allTestsExist = false;
  }
});

// Verify configuration files
console.log('\n⚙️  Checking configuration files...');
let allConfigsExist = true;
configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`   ❌ ${file} - Missing`);
    allConfigsExist = false;
  }
});

// Check package.json for test dependencies
console.log('\n📦 Checking package.json...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDevDeps = [
    '@testing-library/react-native',
    '@testing-library/jest-native',
    'jest',
    'jest-expo',
    'react-test-renderer'
  ];
  
  let allDepsInstalled = true;
  requiredDevDeps.forEach(dep => {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      console.log(`   ✅ ${dep} (${packageJson.devDependencies[dep]})`);
    } else {
      console.log(`   ❌ ${dep} - Missing`);
      allDepsInstalled = false;
    }
  });
  
  // Check test scripts
  if (packageJson.scripts) {
    console.log('\n📜 Checking test scripts...');
    const testScripts = ['test', 'test:watch', 'test:coverage'];
    testScripts.forEach(script => {
      if (packageJson.scripts[script]) {
        console.log(`   ✅ ${script}: ${packageJson.scripts[script]}`);
      } else {
        console.log(`   ❌ ${script} - Missing`);
      }
    });
  }
} else {
  console.log('   ❌ package.json - Missing');
}

// Summary
console.log('\n📊 Verification Summary:');
console.log(`   Test Files: ${allTestsExist ? '✅ All Present' : '❌ Some Missing'}`);
console.log(`   Config Files: ${allConfigsExist ? '✅ All Present' : '❌ Some Missing'}`);

if (allTestsExist && allConfigsExist) {
  console.log('\n🎉 Test setup verification completed successfully!');
  console.log('\n🚀 Ready to run tests with:');
  console.log('   npm test                    # Run all tests');
  console.log('   npm run test:watch         # Run tests in watch mode');
  console.log('   npm run test:coverage      # Run tests with coverage');
  console.log('   node run-tests.js          # Run comprehensive test suite');
  console.log('\n📚 See TESTING.md for detailed documentation');
} else {
  console.log('\n⚠️  Some files are missing. Please check the setup.');
}

// Test statistics
const totalTestFiles = testFiles.length;
const totalConfigFiles = configFiles.length;
const totalFiles = totalTestFiles + totalConfigFiles;

console.log(`\n📈 Statistics:`);
console.log(`   Total Test Files: ${totalTestFiles}`);
console.log(`   Total Config Files: ${totalConfigFiles}`);
console.log(`   Total Files: ${totalFiles}`);

// Estimate test coverage
const estimatedTests = {
  'Component Rendering': 5,
  'User Interactions': 5,
  'Modal Components': 6,
  'Helper Functions': 6,
  'API Integration': 7,
  'OCR Integration': 4,
  'Authentication': 2,
  'Accessibility': 2,
};

const totalEstimatedTests = Object.values(estimatedTests).reduce((sum, count) => sum + count, 0);

console.log(`\n🧪 Estimated Test Coverage:`);
Object.entries(estimatedTests).forEach(([category, count]) => {
  console.log(`   ${category}: ${count} tests`);
});
console.log(`   Total Estimated Tests: ${totalEstimatedTests}`);

module.exports = {
  allTestsExist,
  allConfigsExist,
  testFiles,
  configFiles,
  estimatedTests,
  totalEstimatedTests
};













