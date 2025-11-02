const express = require('express');
const path = require('path');
const app = express();

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

const aiChatRouter = require('./api/ai-chat');
app.use(aiChatRouter); // This works if ai-chat.js exports a router

const servePdfRouter = require('./api/serve-pdf');
app.use('/api/serve-pdf', servePdfRouter);

require('./api/ocr')(app); // Register OCR endpoints

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ... other routes

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));