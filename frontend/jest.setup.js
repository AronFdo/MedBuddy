import '@testing-library/jest-native/extend-expect';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ value, onChange, ...props }) => {
      const MockedDateTimePicker = React.createElement('View', {
        testID: 'date-time-picker',
        ...props,
      });
      return MockedDateTimePicker;
    },
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: ({ children, ...props }) => React.createElement('View', { testID: 'svg', ...props }, children),
    Circle: ({ ...props }) => React.createElement('View', { testID: 'circle', ...props }),
  };
});

// Mock Supabase
jest.mock('../lib/supabase', () => {
  const auth = {
    getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } }, error: null })),
  };
  const from = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
      in: jest.fn(() => Promise.resolve({ error: null })),
    })),
  }));

  return { supabase: { auth, from } };
});

// Mock ProfileContext
jest.mock('../lib/ProfileContext', () => ({
  useProfile: () => ({
    profile: {
      id: 'test-profile-id',
      meal_times: {
        breakfast: '08:00',
        lunch: '12:00',
        dinner: '18:00',
      },
    },
    loading: false,
  }),
}));

// Mock config
jest.mock('../lib/config', () => ({
  BACKEND_URL: 'http://localhost:3000',
}));

// Mock Alert
global.Alert = {
  alert: jest.fn(),
};
