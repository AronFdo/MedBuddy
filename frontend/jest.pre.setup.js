// Ensure console exists and is not redefined in a problematic way
if (typeof global.console === 'undefined') {
  // eslint-disable-next-line no-console
  global.console = console;
}

// Ensure navigator is defined for react-native environment quirks
if (typeof global.navigator === 'undefined') {
  global.navigator = {};
}

// Polyfill fetch if missing in Node environment used by Jest
if (typeof global.fetch === 'undefined') {
  global.fetch = () => Promise.reject(new Error('fetch not implemented in tests'));
}
