require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json({ limit: '10mb' }));

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper: Call OpenAI Vision API
async function extractMedicationFromImage(base64Image) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  // Update the OpenAI prompt to request 'days'
  const prompt = `Extract the medicine name, dosage, frequency, instructions, and the number of days the medication should be taken (as an integer, key: days) from this prescription image. Return as JSON with keys: name, dosage, frequency, instructions, days.`;
  const messages = [
    { role: 'system', content: 'You are a helpful assistant that extracts medication information from prescription images.' },
    { role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: base64Image } }
    ] }
  ];
  const response = await axios.post(apiUrl, {
    model: 'gpt-4.1',
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
  console.log('Received /api/ocr/medication request');
  console.log('user_id:', user_id);
  if (image) {
    console.log('image length:', image.length);
  } else {
    console.log('No image received');
  }
  if (!image || !user_id) {
    console.log('Missing image or user_id');
    return res.status(400).json({ error: 'Missing image or user_id' });
  }
  try {
    // OpenAI expects image as a URL, so we use data URL
    const base64Url = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
    console.log('Calling OpenAI Vision API...');
    const medInfo = await extractMedicationFromImage(base64Url);
    console.log('OpenAI response (parsed medInfo):', medInfo);
    // Validate required fields from OpenAI
    const { name, dosage, frequency, days } = medInfo;
    if (!name || !dosage || !frequency) {
      return res.status(400).json({ error: 'Missing required medication fields (name, dosage, frequency) from OCR.' });
    }
    // Generate prescription_id
    const prescription_id = uuidv4();
    // Insert prescription into prescriptions table
    const { data: prescriptionData, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert([{ id: prescription_id, user_id, image_url: base64Url }])
      .select();
    if (prescriptionError) {
      console.log('Supabase prescription insert error:', prescriptionError);
      return res.status(500).json({ error: 'Failed to store prescription in database.' });
    }
    // Set explanation to blank if not provided
    const explanation = medInfo.explanation || '';
    // Store medication in medications table, include days_remaining
    const { data: medicationData, error: medicationError } = await supabase
      .from('medications')
      .insert([{ user_id, prescription_id, name, dosage, frequency, days_remaining: days || null }])
      .select();
    if (medicationError) {
      console.log('Supabase medication insert error:', medicationError);
      return res.status(500).json({ error: 'Failed to store medication in database.' });
    }
    console.log('Supabase insert success:', { prescription: prescriptionData[0], medication: medicationData[0] });
    res.json({ prescription: prescriptionData[0], medication: medicationData[0] });
  } catch (err) {
    console.log('OCR processing error:', err);
    res.status(500).json({ error: err.message || 'OCR processing failed.' });
  }
});

app.listen(port, () => {
  console.log(`OCR API listening on port ${port}`);
}); 