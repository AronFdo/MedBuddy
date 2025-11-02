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

// Register routes with error handling
console.log('Loading routes...');
try {
  console.log('Loading ai-chat router...');
  const aiChatRouter = require('./api/ai-chat');
  app.use(aiChatRouter); // This works if ai-chat.js exports a router
  console.log('✓ ai-chat router loaded');

  console.log('Loading serve-pdf router...');
  const servePdfRouter = require('./api/serve-pdf');
  app.use('/api/serve-pdf', servePdfRouter);
  console.log('✓ serve-pdf router loaded');

  console.log('Loading OCR routes...');
  require('./api/ocr')(app); // Register OCR endpoints
  console.log('✓ OCR routes loaded');

  // Health check endpoint (must work even if other routes fail)
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  console.log('✓ Health check endpoint registered');

  console.log('All routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading routes:', error);
  console.error('Stack trace:', error.stack);
  
  // Still register health check so the server can report its status
  app.get('/health', (req, res) => {
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Server is running but some routes failed to load',
      timestamp: new Date().toISOString() 
    });
  });
  
  // Don't exit - let the server start anyway for health checks
}

// Error handling middleware (must be AFTER all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't exit - let the server continue running
  // In production, you might want to restart the process instead
});

// Handle uncaught exceptions (only exit if in production)
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Give the server time to log and then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// ... other routes

const PORT = process.env.PORT || 3001;
console.log(`Attempting to start server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Health check available at http://localhost:${PORT}/health`);
  console.log('✓ Server ready to accept requests');
}).on('error', (err) => {
  console.error('✗ Server failed to start:', err);
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
  }
  
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown...');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});