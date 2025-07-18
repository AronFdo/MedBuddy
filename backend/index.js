const express = require('express');
require('dotenv').config();
const app = express();

app.use(express.json()); // for parsing JSON bodies

const aiChatRouter = require('./api/ai-chat');
app.use(aiChatRouter); // This works if ai-chat.js exports a router

// ... other routes

app.listen(3001, () => console.log('Server running'));