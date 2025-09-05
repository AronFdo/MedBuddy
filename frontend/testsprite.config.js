/**
 * TestSprite Configuration for MedBuddy Medications Component
 * This configuration enables AI-driven testing with TestSprite
 */

module.exports = {
  // Project Information
  project: {
    name: 'MedBuddy',
    version: '1.0.0',
    description: 'Healthcare medication management app',
    type: 'react-native',
  },

  // Component to Test
  component: {
    name: 'Medications',
    path: 'app/(tabs)/Medications.tsx',
    type: 'screen',
    framework: 'react-native',
  },

  // Test Configuration
  testing: {
    framework: 'jest',
    testRunner: 'react-native-testing-library',
    coverage: true,
    watch: false,
    verbose: true,
  },

  // Test Categories
  testCategories: [
    {
      name: 'Component Rendering',
      description: 'Tests basic component rendering and UI elements',
      priority: 'high',
      tests: [
        'renders medications screen with header',
        'shows loading state initially',
        'shows no profile message when no profile selected',
        'displays medications grouped by prescription',
        'shows empty state when no medications exist',
      ],
    },
    {
      name: 'User Interactions',
      description: 'Tests user interactions and navigation',
      priority: 'high',
      tests: [
        'switches between ongoing and past tabs',
        'opens add prescription modal',
        'closes modal when close button pressed',
        'marks medication as taken',
        'opens edit modal when edit button pressed',
      ],
    },
    {
      name: 'Modal Components',
      description: 'Tests modal functionality and forms',
      priority: 'high',
      tests: [
        'renders prescription details form',
        'validates required fields',
        'proceeds to medication form',
        'validates medication form fields',
        'adds medication to list',
        'saves prescription and medications',
      ],
    },
    {
      name: 'Helper Functions',
      description: 'Tests utility functions and calculations',
      priority: 'medium',
      tests: [
        'getNextReminderTime calculations',
        'getDoseProgress calculations',
        'getNextDoseTime logic',
        'getLastMissedDoseTime identification',
        'isDoseTaken verification',
        'decrementDaysRemaining functionality',
      ],
    },
    {
      name: 'API Integration',
      description: 'Tests Supabase API interactions',
      priority: 'high',
      tests: [
        'fetches medications successfully',
        'fetches medication logs',
        'handles fetch errors gracefully',
        'creates medication logs',
        'decrements days remaining',
        'creates prescriptions and medications',
        'deletes prescriptions and medications',
      ],
    },
    {
      name: 'OCR Integration',
      description: 'Tests OCR functionality',
      priority: 'medium',
      tests: [
        'shows OCR scan button',
        'handles OCR scan button press',
        'calls OCR endpoint with correct parameters',
        'handles OCR errors gracefully',
      ],
    },
    {
      name: 'Authentication',
      description: 'Tests authentication and authorization',
      priority: 'high',
      tests: [
        'handles authentication errors',
        'validates user ownership of profile',
      ],
    },
    {
      name: 'Accessibility',
      description: 'Tests accessibility features',
      priority: 'medium',
      tests: [
        'has proper accessibility labels for medication cards',
        'has proper accessibility labels for action buttons',
      ],
    },
  ],

  // Mock Configuration
  mocks: {
    supabase: {
      auth: {
        getUser: 'returns mock user data',
        getSession: 'returns mock session data',
      },
      from: 'returns mock database operations',
    },
    expoRouter: {
      useRouter: 'returns mock router functions',
      useFocusEffect: 'mock focus effect hook',
    },
    expoImagePicker: {
      requestCameraPermissionsAsync: 'returns granted permission',
      requestMediaLibraryPermissionsAsync: 'returns granted permission',
      launchCameraAsync: 'returns mock image data',
      launchImageLibraryAsync: 'returns mock image data',
    },
    reactNativeCommunity: {
      DateTimePicker: 'mock date time picker component',
    },
    reactNativeSvg: {
      Svg: 'mock SVG component',
      Circle: 'mock Circle component',
    },
  },

  // Test Data
  testData: {
    profile: {
      id: 'test-profile-id',
      meal_times: {
        breakfast: '08:00',
        lunch: '12:00',
        dinner: '18:00',
      },
    },
    medications: [
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
    ],
    logs: [
      {
        medication_id: 'med-1',
        log_date: '2024-01-15',
        log_time: '08:00:00',
        status: 'taken',
      },
    ],
  },

  // Environment Configuration
  environment: {
    node: '>=18.0.0',
    reactNative: '^0.79.5',
    expo: '^53.0.20',
    jest: '^29.7.0',
  },

  // Test Execution
  execution: {
    parallel: true,
    timeout: 30000,
    retries: 2,
    bail: false,
  },

  // Reporting
  reporting: {
    format: ['console', 'json', 'html'],
    output: './test-results',
    coverage: {
      threshold: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },

  // AI Testing Features
  aiTesting: {
    enabled: true,
    features: [
      'automated test generation',
      'intelligent test case discovery',
      'dynamic test data generation',
      'visual regression testing',
      'performance testing',
      'accessibility testing',
    ],
    model: 'gpt-4',
    temperature: 0.1,
  },
};
