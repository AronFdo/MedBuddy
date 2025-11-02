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

// Track server readiness
let serverReady = false;

// Root endpoint - Railway often checks this (register early)
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'MedBuddy Backend API',
    timestamp: new Date().toISOString(),
    ready: serverReady,
    uptime: process.uptime()
  });
});

// Health check endpoint - Railway uses this for health checks (register early)
app.get('/health', (req, res) => {
  const hasSupabase = !!process.env.SUPABASE_URL;
  res.status(200).json({ 
    status: hasSupabase ? 'OK' : 'WARNING',
    timestamp: new Date().toISOString(),
    supabaseConfigured: hasSupabase,
    ready: serverReady,
    uptime: process.uptime()
  });
});

// Keep-alive endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'pong', timestamp: new Date().toISOString() });
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

try {
  const servePdfRouter = require('./api/serve-pdf');
  app.use('/api/serve-pdf', servePdfRouter);
  console.log('✓ Serve PDF route loaded');
} catch (error) {
  console.error('❌ Error loading Serve PDF route:', error.message);
  console.error('Stack:', error.stack);
  // Continue - health endpoint will still work
}

try {
  require('./api/ocr')(app);
  console.log('✓ OCR routes loaded');
} catch (error) {
  console.error('❌ Error loading OCR routes:', error.message);
  console.error('Stack:', error.stack);
  // Continue - health endpoint will still work
}

serverReady = true;
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
    console.log(`✓ Health check available at http://0.0.0.0:${PORT}/health`);
    console.log(`✓ Root endpoint available at http://0.0.0.0:${PORT}/`);
    console.log(`✓ Server is listening and ready to accept connections`);
    // serverReady is already set to true after routes are loaded
    console.log(`✓ Server fully initialized and ready (ready: ${serverReady})`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Keep the process alive and log periodically
let keepAliveInterval = setInterval(() => {
  // Log every 5 minutes to show server is alive
  if (Date.now() % 300000 < 1000) {
    console.log(`✓ Server heartbeat - uptime: ${Math.floor(process.uptime())}s`);
  }
}, 30000);

// Clean up interval on exit
process.on('SIGTERM', () => {
  console.log('⚠️  Received SIGTERM, shutting down gracefully...');
  clearInterval(keepAliveInterval);
  if (server) {
    server.close(() => {
      console.log('✓ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('⚠️  Received SIGINT, shutting down gracefully...');
  clearInterval(keepAliveInterval);
  if (server) {
    server.close(() => {
      console.log('✓ Server closed');
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
