const express = require('express');
const path = require('path');
const app = express();

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  // Load local env from backend/.env regardless of where the app is started
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

// Validate required environment variables at startup
console.log('Starting MedBuddy Backend...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set (will use 3001)');

const requiredEnvVars = ['SUPABASE_URL'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please ensure all required environment variables are set in Railway.');
  // Don't crash immediately - let it attempt to start and fail gracefully
}

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Increase body parser limits for large image data
const BODY_SIZE_LIMIT = process.env.BODY_SIZE_LIMIT || '10mb';
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ limit: BODY_SIZE_LIMIT, extended: true }));

// Simple health check endpoints (Railway just checks if port responds, but these are useful for debugging)
app.get('/', (req, res) => {
  res.json({ status: 'OK', service: 'MedBuddy Backend API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register routes with error handling (after health checks)
// Load synchronously so Railway doesn't kill container during async loading
console.log('Loading API routes...');

try {
  const aiChatRouter = require('./api/ai-chat');
  app.use(aiChatRouter);
  console.log('✓ AI Chat route loaded');
} catch (error) {
  console.error('❌ Error loading AI Chat route:', error.message);
  console.error('Stack:', error.stack);
  // Continue - health endpoint will still work
}

// TEMPORARILY DISABLED - Testing if servePDF is causing issues
// try {
//   const servePdfRouter = require('./api/serve-pdf');
//   app.use('/api/serve-pdf', servePdfRouter);
//   console.log('✓ Serve PDF route loaded');
// } catch (error) {
//   console.error('❌ Error loading Serve PDF route:', error.message);
//   console.error('Stack:', error.stack);
//   // Continue - health endpoint will still work
// }
console.log('⚠️  Serve PDF route temporarily disabled for testing');

try {
  require('./api/ocr')(app);
  console.log('✓ OCR routes loaded');
} catch (error) {
  console.error('❌ Error loading OCR routes:', error.message);
  console.error('Stack:', error.stack);
  // Continue - health endpoint will still work
}

console.log('✓ All routes loaded (or failed gracefully)');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ... other routes

const PORT = process.env.PORT || 3001;

// Start server with error handling
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Server ready to accept connections`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Handle graceful shutdown (Railway sends SIGTERM)
process.on('SIGTERM', () => {
  console.log('⚠️  Received SIGTERM, shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('✓ Server closed gracefully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('⚠️  Received SIGINT, shutting down...');
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Give time for logs to flush before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Log but don't exit immediately - allow server to continue if possible
  console.error('⚠️  Continuing despite unhandled rejection - check for issues');
});
