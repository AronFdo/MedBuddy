require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Remove any app instantiation or app.listen from this file
// Wrap all endpoint registrations in a function that takes 'app' as an argument

module.exports = (app) => {
  // Initialize Supabase client
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // POST /api/ocr/medication - Enhanced single medication OCR
  app.post('/api/ocr/medication', async (req, res) => {
    const { image, user_id, profile_id } = req.body;
    console.log('Received /api/ocr/medication request');
    console.log('user_id:', user_id);
    console.log('Request body size:', JSON.stringify(req.body).length, 'characters');
    if (image) {
      console.log('image length:', image.length, 'characters');
      console.log('image size (approx):', (image.length * 0.75 / (1024 * 1024)).toFixed(2), 'MB');
    } else {
      console.log('No image received');
    }
    if (!image || !user_id) {
      console.log('Missing image or user_id');
      return res.status(400).json({ error: 'Missing image or user_id' });
    }
    if (!profile_id) {
      console.log('Missing profile_id');
      return res.status(400).json({ error: 'Missing profile_id' });
    }
    
    // Validate that the profile belongs to the authenticated user
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', profile_id)
        .single();
      
      if (profileError || !profileData) {
        console.log('Profile not found:', profileError);
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      if (profileData.user_id !== user_id) {
        console.log('Profile does not belong to user:', { profileUserId: profileData.user_id, requestUserId: user_id });
        return res.status(403).json({ error: 'Profile does not belong to authenticated user' });
      }
    } catch (validationError) {
      console.log('Profile validation error:', validationError);
      return res.status(500).json({ error: 'Failed to validate profile ownership' });
    }
    
    try {
      // OpenAI expects image as a URL, so we use data URL
      const base64Url = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
      console.log('Calling OpenAI Vision API...');
      const medInfo = await extractMedicationFromImage(base64Url);
      console.log('OpenAI response (parsed medInfo):', medInfo);
      
      // Validate required fields from OpenAI
      const { name, dosage, frequency, days, quantity, instructions } = medInfo;
      if (!name || !dosage || !frequency) {
        return res.status(400).json({ error: 'Missing required medication fields (name, dosage, frequency) from OCR.' });
      }

      // Calculate days if not provided but quantity and frequency are available
      let calculatedDays = days;
      if (!days && quantity && frequency) {
        calculatedDays = calculateDaysFromQuantity(quantity, frequency, dosage);
        console.log('Day calculation result:', { originalDays: days, calculatedDays, quantity, frequency, dosage });
      }
      
      // If we have days but no quantity, try to estimate quantity
      if (days && !quantity && frequency) {
        const estimatedQuantity = days * frequency;
        console.log('Estimated quantity from days:', { days, frequency, estimatedQuantity });
      }

      // Return extracted medication details for frontend form population
      const extractedMedication = {
        name: name || '',
        dosage: dosage || '',
        frequency: frequency?.toString() || '',
        days_remaining: calculatedDays?.toString() || '',
        quantity: quantity || '',
        instructions: instructions || ''
      };
      
      console.log('Extracted medication details for frontend:', extractedMedication);
      res.json({ 
        success: true,
        medication: extractedMedication,
        message: 'Medication details extracted successfully. Please review and adjust if needed.'
      });
    } catch (err) {
      console.log('OCR processing error:', err);
      console.error('Full error details:', err);
      // Send a more detailed error response
      res.status(500).json({ 
        error: err.message || 'OCR processing failed.',
        details: err.stack || 'No additional details available'
      });
    }
  });

  // POST /api/medications/manual
  app.post('/api/medications/manual', async (req, res) => {
    const { name, dosage, frequency, days_remaining, user_id, profile_id } = req.body;
    // Token verification
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    const token = authHeader.split(' ')[1];
    let tokenUserId;
    try {
      const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      tokenUserId = payload.sub;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (tokenUserId !== user_id) {
      return res.status(401).json({ error: 'User ID does not match token' });
    }
    if (!name || !dosage || !frequency || !days_remaining || !user_id || !profile_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      // Debug logging
      console.log('Manual medication insert:', { name, dosage, frequency, days_remaining, user_id, profile_id });
      // Generate explanations in 3 languages using OpenAI
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const prompt = `Explain the following medication in simple terms for a patient: Name: ${name}, Dosage: ${dosage}, Frequency: ${frequency} times per day, Days: ${days_remaining}`;
      const explanations = {};
      for (const [lang, langName] of Object.entries({ en: 'English', si: 'Sinhala', ta: 'Tamil' })) {
        const langPrompt = `${prompt}\nRespond in ${langName}.`;
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4',
            messages: [
              { role: 'system', content: `You are a helpful medical assistant. Reply in ${langName}.` },
              { role: 'user', content: langPrompt }
            ],
            max_tokens: 200,
          },
          {
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        explanations[lang] = response.data.choices[0].message.content.trim();
      }
      // Insert medication into DB
      const insertPayload = {
        medication_id: uuidv4(),
        profile_id,
        name,
        dosage,
        frequency,
        days_remaining,
        explanation_en: explanations.en,
        explanation_si: explanations.si,
        explanation_ta: explanations.ta,
      };
      console.log('Insert payload:', insertPayload);
      const { data, error } = await supabase.from('medications').insert(insertPayload).select().single();
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ medication: data });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to add medication.' });
    }
  });

  // ...add any other endpoints here...
};

// Helper: Calculate days from quantity and frequency
function calculateDaysFromQuantity(quantity, frequency, dosage) {
  try {
    // Extract numeric values
    const quantityNum = parseFloat(quantity.toString().replace(/[^\d.]/g, ''));
    const frequencyNum = parseFloat(frequency.toString().replace(/[^\d.]/g, ''));
    
    if (isNaN(quantityNum) || isNaN(frequencyNum) || frequencyNum <= 0) {
      console.log('Invalid quantity or frequency for day calculation:', { quantity, frequency, dosage });
      return null;
    }

    // Calculate days: quantity / (frequency per day)
    const days = Math.ceil(quantityNum / frequencyNum);
    const result = Math.max(1, days); // Minimum 1 day
    
    console.log(`Day calculation: ${quantityNum} units ÷ ${frequencyNum} times/day = ${result} days`);
    
    // Additional validation based on dosage format
    if (dosage) {
      const dosageStr = dosage.toString().toLowerCase();
      
      // If dosage mentions multiple units per dose, adjust calculation
      if (dosageStr.includes('2 tablet') || dosageStr.includes('2 capsule') || dosageStr.includes('2 pill')) {
        const adjustedDays = Math.ceil(quantityNum / (frequencyNum * 2));
        console.log(`Adjusted for 2 units per dose: ${quantityNum} ÷ (${frequencyNum} × 2) = ${adjustedDays} days`);
        return Math.max(1, adjustedDays);
      }
      
      if (dosageStr.includes('3 tablet') || dosageStr.includes('3 capsule') || dosageStr.includes('3 pill')) {
        const adjustedDays = Math.ceil(quantityNum / (frequencyNum * 3));
        console.log(`Adjusted for 3 units per dose: ${quantityNum} ÷ (${frequencyNum} × 3) = ${adjustedDays} days`);
        return Math.max(1, adjustedDays);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error calculating days from quantity:', error);
    return null;
  }
}

// Helper: Call OpenAI Vision API for single medication
async function extractMedicationFromImage(base64Image) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  
  const prompt = `Extract medication information from this prescription image. Look for:
1. Medicine name (brand or generic)
2. Dosage (e.g., 500mg, 10ml, 1 tablet, 2 capsules, 250mg tablet)
3. Frequency (how many times per day)
4. Quantity (total number of tablets/capsules/units prescribed)
5. Instructions (special instructions if any)
6. Days (if explicitly mentioned)

IMPORTANT GUIDELINES:
- For dosage: Include the unit (tablet, capsule, mg, ml, etc.) if visible
- For quantity: Look for total number of units (e.g., "30 tablets", "20 capsules", "60 pills")
- For frequency: Extract how many times per day (e.g., "twice daily" = 2, "once daily" = 1)
- For days: If not explicitly mentioned, calculate as quantity ÷ frequency (e.g., 30 tablets ÷ 2 times/day = 15 days)

Return as JSON with keys: name, dosage, frequency, quantity, instructions, days.
If days is not explicitly mentioned, calculate it as quantity ÷ frequency.
If quantity is mentioned, include it even if days is also mentioned.

Example responses:
{
  "name": "Paracetamol",
  "dosage": "500mg tablet",
  "frequency": 3,
  "quantity": 30,
  "instructions": "Take after meals",
  "days": 10
}

{
  "name": "Amoxicillin",
  "dosage": "250mg capsule",
  "frequency": 2,
  "quantity": 20,
  "instructions": "Take on empty stomach",
  "days": null
}`;

  const messages = [
    { role: 'system', content: 'You are a medical assistant that extracts medication information from prescription images. Be precise and extract all available information. Pay special attention to dosage units (tablets, capsules, mg, ml) and calculate days from quantity and frequency when not explicitly stated.' },
    { role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: base64Image } }
    ] }
  ];
  
  const response = await axios.post(apiUrl, {
    model: 'gpt-4o',
    messages,
    max_tokens: 500,
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
    const parsedData = JSON.parse(jsonString);
    
    // Post-process the data to ensure proper day calculation
    if (!parsedData.days && parsedData.quantity && parsedData.frequency) {
      const calculatedDays = Math.ceil(parsedData.quantity / parsedData.frequency);
      parsedData.days = calculatedDays;
      console.log(`Calculated days: ${parsedData.quantity} ÷ ${parsedData.frequency} = ${calculatedDays} days`);
    }
    
    return parsedData;
  } catch (e) {
    throw new Error('Failed to parse medication info from OpenAI response.');
  }
}

 