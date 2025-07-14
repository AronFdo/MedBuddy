require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json({ limit: '10mb' }));

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper: Call OpenAI Vision API
async function extractMedicationFromImage(base64Image) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const prompt = `Extract the medicine name, dosage, and instructions from this prescription image. Return as JSON with keys: name, dosage, instructions.`;
  const messages = [
    { role: 'system', content: 'You are a helpful assistant that extracts medication information from prescription images.' },
    { role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: base64Image } }
    ] }
  ];
  const response = await axios.post(apiUrl, {
    model: 'gpt-4-vision-preview',
    messages,
    max_tokens: 300,
  }, {
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
  });
  // Parse the response for JSON
  const text = response.data.choices[0].message.content;
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.substring(jsonStart, jsonEnd);
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Failed to parse medication info from OpenAI response.');
  }
}

// POST /api/ocr/medication
app.post('/api/ocr/medication', async (req, res) => {
  const { image, user_id } = req.body;
  if (!image || !user_id) {
    return res.status(400).json({ error: 'Missing image or user_id' });
  }
  try {
    // OpenAI expects image as a URL, so we use data URL
    const base64Url = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
    const medInfo = await extractMedicationFromImage(base64Url);
    // Store in Supabase
    const { data, error } = await supabase
      .from('medications')
      .insert([{ ...medInfo, user_id }])
      .select();
    if (error) {
      return res.status(500).json({ error: 'Failed to store medication in database.' });
    }
    res.json({ medication: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'OCR processing failed.' });
  }
});

app.listen(port, () => {
  console.log(`OCR API listening on port ${port}`);
}); 