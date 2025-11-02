const express = require('express');
const path = require('path');
const app = express();

console.log('Starting MedBuddy Backend Server...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

if (process.env.NODE_ENV !== 'production') {
  // Load local env from backend/.env regardless of where the app is started
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.join(__dirname, '.env') });
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

// Health check endpoint (register FIRST so it always works)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
console.log('✓ Health check endpoint registered (early)');

// Register routes with error handling
console.log('Loading routes...');
let routesLoaded = false;

try {
  console.log('Loading ai-chat router...');
  const aiChatRouter = require('./api/ai-chat');
  if (aiChatRouter && typeof aiChatRouter === 'object') {
    app.use(aiChatRouter);
    console.log('✓ ai-chat router loaded');
  } else {
    console.warn('⚠ ai-chat router format unexpected, attempting to use anyway');
    app.use(aiChatRouter);
  }
} catch (error) {
  console.error('✗ Error loading ai-chat router:', error.message);
  console.error('Stack:', error.stack);
  // Continue - don't crash
}

try {
  console.log('Loading serve-pdf router...');
  const servePdfRouter = require('./api/serve-pdf');
  app.use('/api/serve-pdf', servePdfRouter);
  console.log('✓ serve-pdf router loaded');
} catch (error) {
  console.error('✗ Error loading serve-pdf router:', error.message);
  console.error('Stack:', error.stack);
  // Continue - don't crash
}

try {
  console.log('Loading OCR routes...');
  const ocrModule = require('./api/ocr');
  if (typeof ocrModule === 'function') {
    ocrModule(app);
    console.log('✓ OCR routes loaded');
  } else {
    console.warn('⚠ OCR module format unexpected');
  }
} catch (error) {
  console.error('✗ Error loading OCR routes:', error.message);
  console.error('Stack:', error.stack);
  // Continue - don't crash
}

routesLoaded = true;
console.log('Route loading complete');

// Error handling middleware (must be AFTER all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Handle unhandled promise rejections - CRITICAL: Don't let these crash the container
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Error stack:', reason.stack);
  }
  // DO NOT exit - Railway will kill the container if process exits
  // Log and continue - the error handling middleware will catch request errors
});

// Handle uncaught exceptions - CRITICAL: Catch and log, don't exit immediately
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Log the error but DON'T exit - Railway needs the process to stay alive
  // The server should still be able to respond to health checks
  // Only exit if it's a critical error that makes the server unusable
});

// ... other routes

// Railway automatically sets PORT environment variable
// If not set, default to 3001 for local development
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('='.repeat(50));
console.log('Server Configuration:');
console.log(`  PORT: ${PORT} ${process.env.PORT ? '(from Railway)' : '(default)'}`);
console.log(`  HOST: ${HOST}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  Railway URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Not set'}`);
console.log('='.repeat(50));
console.log(`Attempting to start server on ${HOST}:${PORT}...`);

let server;

try {
  server = app.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('✓ SERVER SUCCESSFULLY STARTED');
    console.log(`✓ Listening on ${HOST}:${PORT}`);
    console.log(`✓ Health check: http://${HOST}:${PORT}/health`);
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      console.log(`✓ Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }
    console.log('✓ Server ready to accept requests');
    console.log('='.repeat(50));
  }).on('error', (err) => {
    console.error('✗ Server failed to start:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please use a different port.`);
    }
    
    // Only exit if we can't start the server at all
    // Railway will restart the container
    setTimeout(() => {
      console.error('Exiting due to server startup failure...');
      process.exit(1);
    }, 5000); // Give time for logs to flush
  });
  
    console.log('Server listen call completed');
    
    // Register graceful shutdown handlers AFTER server is created
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      if (server && server.close) {
        server.close(() => {
          console.log('Server closed gracefully');
          process.exit(0);
        });
        
        // Force close after 10 seconds if graceful shutdown doesn't complete
        setTimeout(() => {
          console.error('Forcing shutdown after timeout...');
          process.exit(1);
        }, 10000);
      } else {
        console.log('Server not running, exiting immediately');
        process.exit(0);
      }
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      if (server && server.close) {
        server.close(() => {
          console.log('Server closed gracefully');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    console.log('Graceful shutdown handlers registered');
} catch (error) {
  console.error('✗ Fatal error during server startup:', error);
  console.error('Stack:', error.stack);
  // Give Railway time to capture logs before exit
  setTimeout(() => {
    process.exit(1);
  }, 2000);
}