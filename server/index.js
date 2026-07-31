// Lightweight local backend to proxy to Nyarch (or a mock) and store conversations on-disk.
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
const PROMPT_FILE = path.join(DATA_DIR, 'system_prompt.txt');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CONV_FILE)) fs.writeFileSync(CONV_FILE, JSON.stringify({ conversations: [] }, null, 2));
if (!fs.existsSync(PROMPT_FILE)) fs.writeFileSync(PROMPT_FILE, 'You are Nyarch assistant. Be helpful, concise.');

const app = express();
app.use(morgan('dev'));
// Bind CORS to localhost only by default
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'web')));

const NYARCH_URL = process.env.NYARCH_URL || '';

function readConversations() {
  try {
    return JSON.parse(fs.readFileSync(CONV_FILE, 'utf8'));
  } catch (e) {
    return { conversations: [] };
  }
}
function writeConversations(data) {
  fs.writeFileSync(CONV_FILE, JSON.stringify(data, null, 2));
}
function readPrompt() {
  try { return fs.readFileSync(PROMPT_FILE, 'utf8'); } catch(e) { return 'You are Nyarch assistant.'; }
}
function writePrompt(s) { fs.writeFileSync(PROMPT_FILE, s); }

app.get('/api/conversations', (req, res) => {
  res.json(readConversations());
});

app.post('/api/admin/prompt', (req, res) => {
  const { prompt } = req.body;
  if (typeof prompt !== 'string') return res.status(400).json({ error: 'prompt (string) required' });
  writePrompt(prompt);
  res.json({ ok: true });
});

// Simple chat endpoint. Body: {conversationId?, message}
app.post('/api/chat', async (req, res) => {
  const { conversationId, message, params } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message string required' });

  const convData = readConversations();
  let convo = null;
  if (conversationId) convo = convData.conversations.find(c => c.id === conversationId);
  if (!convo) {
    convo = { id: Date.now().toString(), messages: [] };
    convData.conversations.unshift(convo);
  }

  // Push user message
  convo.messages.push({ role: 'user', content: message, ts: Date.now() });

  // Build messages array for Nyarch
  const systemPrompt = readPrompt();
  const messagesForNyarch = [{ role: 'system', content: systemPrompt }, ...convo.messages.map(m => ({ role: m.role, content: m.content }))];

  try {
    let assistantReply = '';
    if (NYARCH_URL) {
      // Forward request to Nyarch endpoint (expects OpenAI-like format)
      const payload = {
        model: (params && params.model) || 'nyarch-default',
        messages: messagesForNyarch,
        temperature: params && params.temperature
      };
      const r = await fetch(NYARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 300000
      });
      if (!r.ok) {
        const text = await r.text();
        assistantReply = `Nyarch error: ${r.status} ${text}`;
      } else {
        const json = await r.json();
        // Expect OpenAI-like response
        assistantReply = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || json.answer || JSON.stringify(json);
      }
    } else {
      // Mock Nyarch locally
      assistantReply = `Nyarch (mock): I received your message: "${message}"`;
    }

    convo.messages.push({ role: 'assistant', content: assistantReply, ts: Date.now() });
    writeConversations(convData);

    res.json({ conversationId: convo.id, reply: assistantReply });
  } catch (err) {
    console.error('Chat error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: export conversations
app.get('/api/admin/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(readConversations(), null, 2));
});

// Serve frontend index for any other path (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Nyarch local server listening on http://${HOST}:${PORT} (NYARCH_URL=${NYARCH_URL ? 'configured' : 'not configured - using mock'})`);
});
