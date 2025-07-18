const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/api/ai-chat', async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) {
    return res.status(400).json({ error: 'Missing user_id or message' });
  }

  // 1. Fetch context from Supabase
  const { data: medications } = await supabase
    .from('medications')
    .select('name, dosage, frequency, explanation_en')
    .eq('user_id', user_id);

  const { data: appointments } = await supabase
    .from('appointments')
    .select('doctor_name, date, notes')
    .eq('user_id', user_id);

  // Fetch last 20 conversation messages
  const { data: history } = await supabase
    .from('ai_conversations')
    .select('message, sender, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true })
    .limit(20);

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
    // 4. Store user and bot messages in conversations table
    await supabase.from('conversations').insert([
      { user_id, message, sender: 'user' },
      { user_id, message: aiResponse, sender: 'bot' }
    ]);
    res.json({ response: aiResponse });
  } catch (err) {
    res.status(500).json({ error: 'AI model error', details: err.message });
  }
});

module.exports = router;