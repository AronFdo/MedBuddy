const express = require('express');
require('dotenv').config();
const app = express();

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
app.use(express.json({ limit: '50mb' })); // for parsing JSON bodies
app.use(express.urlencoded({ limit: '50mb', extended: true })); // for parsing URL-encoded bodies

const aiChatRouter = require('./api/ai-chat');
app.use(aiChatRouter); // This works if ai-chat.js exports a router

const servePdfRouter = require('./api/serve-pdf');
app.use('/api/serve-pdf', servePdfRouter);

require('./api/ocr')(app); // Register OCR endpoints

// ... other routes

app.listen(3001, () => console.log('Server running'));