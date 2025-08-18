const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/api/ai-chat', async (req, res) => {
  const { user_id, profile_id, message } = req.body;
  if (!user_id || !profile_id || !message) {
    return res.status(400).json({ error: 'Missing user_id, profile_id, or message' });
  }

  // 1. Fetch context from Supabase using profile_id (bypass RLS with service role)
  const { data: medications, error: medError } = await supabase
    .from('medications')
    .select('name, dosage, frequency, explanation_en')
    .eq('profile_id', profile_id);

  if (medError) {
    console.error('Error fetching medications:', medError);
  }

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('doctor_name, date, notes')
    .eq('profile_id', profile_id);

  if (apptError) {
    console.error('Error fetching appointments:', apptError);
  }

  // Fetch last 20 conversation messages
  const { data: history, error: historyError } = await supabase
    .from('ai_conversations')
    .select('message, sender, created_at')
    .eq('profile_id', profile_id)
    .order('created_at', { ascending: true })
    .limit(20);

  if (historyError) {
    console.error('Error fetching conversation history:', historyError);
  }

  // Debug: Log what data we're getting
  console.log('AI Chat - Profile ID:', profile_id);
  console.log('AI Chat - Medications found:', medications?.length || 0);
  console.log('AI Chat - Appointments found:', appointments?.length || 0);
  console.log('AI Chat - History messages found:', history?.length || 0);

  // 2. Build the prompt
  let historyText = '';
  if (history && history.length > 0) {
    historyText = history.map(h => `${h.sender === 'user' ? 'User' : 'Bot'}: ${h.message}`).join('\n');
  }
  const prompt = `
You are a helpful medical assistant. Here is the user's medication list:
${JSON.stringify(medications, null, 2)}

Here are their upcoming appointments:
${JSON.stringify(appointments, null, 2)}

Conversation history:
${historyText}

The user asks: ${message}
`;

  // 3. Call OpenAI (or other LLM)
  try {
    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful medical assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const aiResponse = openaiRes.data.choices[0].message.content;
    // 4. Store user and bot messages in ai_conversations table
    const { error: insertError } = await supabase.from('ai_conversations').insert([
      { profile_id, message, sender: 'user' },
      { profile_id, message: aiResponse, sender: 'bot' }
    ]);
    
    if (insertError) {
      console.error('Error inserting conversation messages:', insertError);
    }
    
    res.json({ response: aiResponse });
  } catch (err) {
    res.status(500).json({ error: 'AI model error', details: err.message });
  }
});

module.exports = router;