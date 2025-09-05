#!/usr/bin/env node

/**
 * Test runner script for MedBuddy Medications component
 * This script runs comprehensive tests including unit, integration, and accessibility tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting MedBuddy Medications Component Tests...\n');

// Test configuration
const testConfig = {
  component: 'Medications',
  testFiles: [
    'app/(tabs)/__tests__/Medications.test.tsx',
    'app/(tabs)/__tests__/Medications.modals.test.tsx',
    'app/(tabs)/__tests__/Medications.helpers.test.tsx',
    'app/(tabs)/__tests__/Medications.integration.test.tsx',
  ],
  coverage: true,
  watch: false,
};

// Function to run tests
function runTests() {
  try {
    console.log('📋 Test Configuration:');
    console.log(`   Component: ${testConfig.component}`);
    console.log(`   Test Files: ${testConfig.testFiles.length}`);
    console.log(`   Coverage: ${testConfig.coverage ? 'Enabled' : 'Disabled'}`);
    console.log(`   Watch Mode: ${testConfig.watch ? 'Enabled' : 'Disabled'}\n`);

    // Check if test files exist
    const missingFiles = testConfig.testFiles.filter(file => 
      !fs.existsSync(path.join(__dirname, file))
    );

    if (missingFiles.length > 0) {
      console.log('❌ Missing test files:');
      missingFiles.forEach(file => console.log(`   - ${file}`));
      console.log('\nPlease ensure all test files are created before running tests.\n');
      return;
    }

    // Build test command
    let testCommand = 'npm test';
    
    if (testConfig.coverage) {
      testCommand += ' -- --coverage';
    }
    
    if (testConfig.watch) {
      testCommand += ' -- --watch';
    }

    // Add specific test files
    testCommand += ` -- ${testConfig.testFiles.join(' ')}`;

    console.log('🚀 Running tests...\n');
    console.log(`Command: ${testCommand}\n`);

    // Execute tests
    const result = execSync(testCommand, { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    console.log('\n✅ All tests completed successfully!');
    
    if (testConfig.coverage) {
      console.log('\n📊 Coverage report generated in coverage/ directory');
    }

  } catch (error) {
    console.error('\n❌ Tests failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Function to generate test summary
function generateTestSummary() {
  const summary = {
    component: 'Medications',
    testSuites: [
      {
        name: 'Component Rendering',
        description: 'Tests basic component rendering and UI elements',
        tests: [
          'Renders medications screen with header',
          'Shows loading state initially',
          'Shows no profile message when no profile selected',
          'Displays medications grouped by prescription',
          'Shows empty state when no medications exist'
        ]
      },
      {
        name: 'User Interactions',
        description: 'Tests user interactions and navigation',
        tests: [
          'Switches between Ongoing and Past tabs',
          'Opens add prescription modal',
          'Closes modal when close button pressed',
          'Marks medication as taken',
          'Opens edit modal when edit button pressed'
        ]
      },
      {
        name: 'Modal Components',
        description: 'Tests modal functionality and forms',
        tests: [
          'Renders prescription details form',
          'Validates required fields',
          'Proceeds to medication form',
          'Validates medication form fields',
          'Adds medication to list',
          'Saves prescription and medications'
        ]
      },
      {
        name: 'Helper Functions',
        description: 'Tests utility functions and calculations',
        tests: [
          'getNextReminderTime calculations',
          'getDoseProgress calculations',
          'getNextDoseTime logic',
          'getLastMissedDoseTime identification',
          'isDoseTaken verification',
          'decrementDaysRemaining functionality'
        ]
      },
      {
        name: 'API Integration',
        description: 'Tests Supabase API interactions',
        tests: [
          'Fetches medications successfully',
          'Fetches medication logs',
          'Handles fetch errors gracefully',
          'Creates medication logs',
          'Decrements days remaining',
          'Creates prescriptions and medications',
          'Deletes prescriptions and medications'
        ]
      },
      {
        name: 'OCR Integration',
        description: 'Tests OCR functionality',
        tests: [
          'Shows OCR scan button',
          'Handles OCR scan button press',
          'Calls OCR endpoint with correct parameters',
          'Handles OCR errors gracefully'
        ]
      },
      {
        name: 'Authentication',
        description: 'Tests authentication and authorization',
        tests: [
          'Handles authentication errors',
          'Validates user ownership of profile'
        ]
      },
      {
        name: 'Accessibility',
        description: 'Tests accessibility features',
        tests: [
          'Has proper accessibility labels for medication cards',
          'Has proper accessibility labels for action buttons'
        ]
      }
    ],
    totalTests: 0,
    coverage: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    }
  };

  // Calculate total tests
  summary.totalTests = summary.testSuites.reduce((total, suite) => 
    total + suite.tests.length, 0
  );

  console.log('\n📋 Test Summary:');
  console.log(`   Component: ${summary.component}`);
  console.log(`   Test Suites: ${summary.testSuites.length}`);
  console.log(`   Total Tests: ${summary.totalTests}\n`);

  summary.testSuites.forEach(suite => {
    console.log(`   📁 ${suite.name} (${suite.tests.length} tests)`);
    console.log(`      ${suite.description}`);
  });

  return summary;
}

// Main execution
if (require.main === module) {
  generateTestSummary();
  runTests();
}

module.exports = {
  runTests,
  generateTestSummary,
  testConfig
};

