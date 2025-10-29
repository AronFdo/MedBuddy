# MedBuddy Medications Component Testing

This document provides comprehensive testing information for the Medications component in the MedBuddy React Native application.

## 🧪 Testing Overview

The Medications component has been thoroughly tested using Jest and React Native Testing Library, with additional AI-driven testing capabilities through TestSprite.

### Test Coverage

- **Component Rendering**: Basic UI rendering and state management
- **User Interactions**: Touch events, navigation, and form interactions
- **Modal Components**: Multi-step forms and modal functionality
- **Helper Functions**: Utility functions and calculations
- **API Integration**: Supabase database operations
- **OCR Integration**: Image processing and medication extraction
- **Authentication**: User authentication and authorization
- **Accessibility**: Screen reader support and accessibility features

## 📁 Test Files Structure

```
frontend/
├── app/(tabs)/
│   ├── Medications.tsx                    # Main component
│   └── __tests__/
│       ├── Medications.test.tsx           # Main component tests
│       ├── Medications.modals.test.tsx    # Modal component tests
│       ├── Medications.helpers.test.tsx   # Helper function tests
│       └── Medications.integration.test.tsx # API integration tests
├── jest.config.js                         # Jest configuration
├── jest.setup.js                          # Test setup and mocks
├── run-tests.js                           # Test runner script
├── testsprite.config.js                   # TestSprite configuration
└── TESTING.md                             # This file
```

## 🚀 Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure all testing dependencies are installed:
   ```bash
   npm install --save-dev @testing-library/react-native @testing-library/jest-native jest jest-expo react-test-renderer
   ```

### Running Tests

#### Standard Jest Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Medications.test.tsx
```

#### Using Test Runner Script
```bash
# Run comprehensive test suite
node run-tests.js

# Run with coverage
node run-tests.js --coverage

# Run in watch mode
node run-tests.js --watch
```

#### TestSprite AI Testing
```bash
# Initialize TestSprite (if not already done)
npx testsprite init

# Run AI-driven tests
npx testsprite test --config testsprite.config.js

# Generate additional test cases
npx testsprite generate --component Medications.tsx
```

## 🧩 Test Categories

### 1. Component Rendering Tests
Tests basic component rendering and UI elements:
- ✅ Renders medications screen with header
- ✅ Shows loading state initially
- ✅ Shows no profile message when no profile selected
- ✅ Displays medications grouped by prescription
- ✅ Shows empty state when no medications exist

### 2. User Interaction Tests
Tests user interactions and navigation:
- ✅ Switches between Ongoing and Past tabs
- ✅ Opens add prescription modal
- ✅ Closes modal when close button pressed
- ✅ Marks medication as taken
- ✅ Opens edit modal when edit button pressed

### 3. Modal Component Tests
Tests modal functionality and forms:
- ✅ Renders prescription details form
- ✅ Validates required fields
- ✅ Proceeds to medication form
- ✅ Validates medication form fields
- ✅ Adds medication to list
- ✅ Saves prescription and medications

### 4. Helper Function Tests
Tests utility functions and calculations:
- ✅ getNextReminderTime calculations
- ✅ getDoseProgress calculations
- ✅ getNextDoseTime logic
- ✅ getLastMissedDoseTime identification
- ✅ isDoseTaken verification
- ✅ decrementDaysRemaining functionality

### 5. API Integration Tests
Tests Supabase API interactions:
- ✅ Fetches medications successfully
- ✅ Fetches medication logs
- ✅ Handles fetch errors gracefully
- ✅ Creates medication logs
- ✅ Decrements days remaining
- ✅ Creates prescriptions and medications
- ✅ Deletes prescriptions and medications

### 6. OCR Integration Tests
Tests OCR functionality:
- ✅ Shows OCR scan button
- ✅ Handles OCR scan button press
- ✅ Calls OCR endpoint with correct parameters
- ✅ Handles OCR errors gracefully

### 7. Authentication Tests
Tests authentication and authorization:
- ✅ Handles authentication errors
- ✅ Validates user ownership of profile

### 8. Accessibility Tests
Tests accessibility features:
- ✅ Has proper accessibility labels for medication cards
- ✅ Has proper accessibility labels for action buttons

## 🔧 Mock Configuration

The test suite includes comprehensive mocks for:

### External Dependencies
- **expo-router**: Navigation and routing
- **expo-image-picker**: Camera and image selection
- **@react-native-community/datetimepicker**: Date/time selection
- **react-native-svg**: SVG rendering
- **@supabase/supabase-js**: Database operations

### Internal Dependencies
- **ProfileContext**: User profile management
- **config**: Application configuration
- **Alert**: Native alert dialogs

## 📊 Test Data

### Mock Profile
```javascript
{
  id: 'test-profile-id',
  meal_times: {
    breakfast: '08:00',
    lunch: '12:00',
    dinner: '18:00',
  },
}
```

### Mock Medications
```javascript
[
  {
    medication_id: 'med-1',
    name: 'Paracetamol',
    dosage: '500mg',
    frequency: 2,
    days_remaining: 5,
    reminder_times: ['08:00:00', '18:00:00'],
    prescription_id: 'pres-1',
    prescriptions: {
      id: 'pres-1',
      doctor_name: 'Dr. Smith',
      notes: 'Take with food',
    },
  },
]
```

### Mock Logs
```javascript
[
  {
    medication_id: 'med-1',
    log_date: '2024-01-15',
    log_time: '08:00:00',
    status: 'taken',
  },
]
```

## 🎯 TestSprite AI Features

TestSprite provides AI-driven testing capabilities:

### Automated Test Generation
- Generates additional test cases based on component analysis
- Identifies edge cases and boundary conditions
- Creates performance and stress tests

### Intelligent Test Discovery
- Analyzes component dependencies
- Identifies untested code paths
- Suggests test improvements

### Dynamic Test Data
- Generates realistic test data
- Creates edge case scenarios
- Maintains data consistency

### Visual Regression Testing
- Screenshot comparisons
- UI element detection
- Layout validation

## 📈 Coverage Goals

Target coverage thresholds:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## 🐛 Debugging Tests

### Common Issues

1. **Mock Not Working**
   - Check mock setup in `jest.setup.js`
   - Verify mock is imported before component

2. **Async Operations**
   - Use `waitFor` for async operations
   - Wrap in `act()` for state updates

3. **Navigation Issues**
   - Mock expo-router properly
   - Use `useFocusEffect` mock

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debug info
npm test -- --testNamePattern="renders medications screen" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🔄 Continuous Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v1
```

### Pre-commit Hooks
```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test"
```

## 📚 Additional Resources

- [React Native Testing Library Documentation](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TestSprite Documentation](https://docs.testsprite.com/)
- [Expo Testing Guide](https://docs.expo.dev/guides/testing-with-jest/)

## 🤝 Contributing

When adding new features to the Medications component:

1. **Write Tests First**: Follow TDD principles
2. **Update Mocks**: Add new mocks as needed
3. **Maintain Coverage**: Keep coverage above thresholds
4. **Document Changes**: Update this file with new tests
5. **Run Full Suite**: Ensure all tests pass

## 📞 Support

For testing-related issues:
- Check this documentation first
- Review test files for examples
- Check Jest and React Native Testing Library docs
- Open an issue with test details and error messages













