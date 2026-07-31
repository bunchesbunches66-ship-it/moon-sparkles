const api = {
  async getConvos() { return fetch('/api/conversations').then(r=>r.json()); },
  async send(message, conversationId) { return fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message, conversationId })}).then(r=>r.json()); },
  async getPrompt(){ return fetch('/api/admin/prompt').then(r=>r.ok? r.text() : ''); },
  async savePrompt(p){ return fetch('/api/admin/prompt', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt: p })}).then(r=>r.json()); },
  async export() { return fetch('/api/admin/export').then(r=>r.blob()); }
};

async function refreshConvos(){
  const data = await api.getConvos();
  const list = document.getElementById('convo-list');
  list.innerHTML='';
  (data.conversations||[]).forEach(c=>{
    const li = document.createElement('li');
    li.textContent = `${c.id} — ${c.messages.length} msgs`;
    li.dataset.id = c.id;
    li.addEventListener('click', ()=> loadConversation(c.id));
    list.appendChild(li);
  });
}

let currentConvo = null;
async function loadConversation(id){
  const data = await api.getConvos();
  const c = (data.conversations||[]).find(x=>x.id===id);
  currentConvo = c;
  renderMessages();
}

function renderMessages(){
  const msgs = document.getElementById('messages');
  msgs.innerHTML='';
  if (!currentConvo) return;
  currentConvo.messages.forEach(m=>{
    const d = document.createElement('div');
    d.className = 'msg ' + m.role;
    d.textContent = (m.role==='assistant'? 'Nyarch: ' : 'You: ') + m.content;
    msgs.appendChild(d);
  });
  msgs.scrollTop = msgs.scrollHeight;
}

document.getElementById('input-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const input = document.getElementById('message-input');
  if (!input.value) return;
  const resp = await api.send(input.value, currentConvo && currentConvo.id);
  // reload convos and current conv
  await refreshConvos();
  if (resp.conversationId) await loadConversation(resp.conversationId);
  input.value='';
});

document.getElementById('new-convo').addEventListener('click', async ()=>{
  // sending empty message creates new convo object locally
  const resp = await api.send('');
  await refreshConvos();
  if (resp.conversationId) await loadConversation(resp.conversationId);
});

// Admin
const promptEl = document.getElementById('system-prompt');
(async ()=>{
  // read prompt file by calling /api/admin/prompt (GET is not implemented server-side); we skip and keep blank
  try { const r = await fetch('/api/admin/prompt'); if (r.ok) promptEl.value = await r.text(); } catch(e){}
})();

document.getElementById('save-prompt').addEventListener('click', async ()=>{
  await api.savePrompt(promptEl.value);
  alert('Saved');
});

document.getElementById('export').addEventListener('click', async ()=>{
  const blob = await api.export();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'conversations.json'; a.click(); URL.revokeObjectURL(url);
});

// initial load
refreshConvos();
