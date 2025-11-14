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
console.log('Starting MedBuddy Backend API...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

const requiredEnvVars = ['https://qepwahqrjcfbxuiurgjc.supabase.co'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please ensure all required environment variables are set.');
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

// Simple health check endpoints
app.get('/', (req, res) => {
  res.json({ status: 'OK', service: 'MedBuddy Backend API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register routes with error handling (after health checks)
let routesLoaded = 0;
const totalRoutes = 3;

try {
  const aiChatRouter = require('./api/ai-chat');
  app.use(aiChatRouter);
  routesLoaded++;
} catch (error) {
  console.error('Error loading AI Chat route:', error.message);
  // Continue - health endpoint will still work
}

try {
  const servePdfRouter = require('./api/serve-pdf');
  app.use('/api/serve-pdf', servePdfRouter);
  routesLoaded++;
} catch (error) {
  console.error('Error loading Serve PDF route:', error.message);
  // Continue - health endpoint will still work
}

try {
  require('./api/ocr')(app);
  routesLoaded++;
} catch (error) {
  console.error('Error loading OCR routes:', error.message);
  // Continue - health endpoint will still work
}

console.log(`Loaded ${routesLoaded}/${totalRoutes} API route modules`);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

const PORT = process.env.PORT || 8080;

// Start server with error handling
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('MedBuddy Backend API Container Ready');
    console.log(`Listening on port ${PORT} (0.0.0.0)`);
    console.log(`Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`PID: ${process.pid}`);
    console.log('═══════════════════════════════════════════════════════');
  });
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}

// Handle graceful shutdown (Cloud Run sends SIGTERM)
process.on('SIGTERM', () => {
  const uptime = Math.floor(process.uptime());
  console.log(`\nSIGTERM received - Graceful shutdown initiated (uptime: ${uptime}s)`);
  if (server) {
    server.close(() => {
      console.log('Server closed successfully');
      process.exit(0);
    });
    // Force exit after 5 seconds if close doesn't complete
    setTimeout(() => {
      console.log('Force exiting after timeout');
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received - Shutting down...');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
  console.error('Error code:', error.code);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Handle uncaught exceptions - but don't exit immediately
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  console.error('Process will exit in 2 seconds...');
  // Give time for logs to flush before exiting
  setTimeout(() => {
    console.error('Exiting due to uncaught exception');
    process.exit(1);
  }, 2000);
});

// Handle unhandled promise rejections - log but don't exit
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection detected');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Continuing despite unhandled rejection');
});
