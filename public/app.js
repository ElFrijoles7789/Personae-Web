
function getStore(key, def) { try { return JSON.parse(localStorage.getItem('personae_'+key)) || def; } catch { return def; } }
function setStore(key, val) { localStorage.setItem('personae_'+key, JSON.stringify(val)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

let characters = getStore('characters', []);
let chats = getStore('chats', []);
let currentTab = 'mine';
let currentView = 'home';
let currentCharacter = null;
let currentChat = null;
let editingCharacter = null;
let sending = false;
let speakingId = null;

function detectLang(text) {
  if (!text) return 'es';
  const s = text.toLowerCase().slice(0,500);
  if (/[\\u4e00-\\u9fff]/.test(s)) return 'zh';
  if (/[\\u3040-\\u30ff]/.test(s)) return 'ja';
  const scores = {es:0,en:0,pt:0,fr:0,it:0,de:0};
  if (/ñ|á|é|í|ó|ú|¿|¡/.test(s)) scores.es += 3;
  if (/ç|œ|à|â|è|ê|ë|ï|î|ô|û|ù/.test(s)) scores.fr += 2;
  if (/ä|ö|ü|ß/.test(s)) scores.de += 3;
  if (/ã|õ|ç/.test(s)) scores.pt += 2;
  const esW = /\\b(el|la|que|de|en|y|una|por|con|su|para|como|más|pero|no|sí|qué|cómo|es|son|tengo|hacer|poder|decir)\\b/g;
  const enW = /\\b(the|of|and|to|a|in|is|it|you|that|was|for|on|are|with|his|they|at|be|this|have|from)\\b/g;
  const ptW = /\\b(o|a|os|as|que|de|em|e|para|com|não|uma|um|por|seu|sua|como|mais|mas|sim|não|é|sou|tenho|fazer)\\b/g;
  const frW = /\\b(le|la|les|de|et|à|en|un|une|que|qui|dans|pour|avec|sur|ne|pas|ce|se|sa|son|mais|être|avoir|faire)\\b/g;
  const itW = /\\b(il|la|i|le|di|che|in|e|per|con|non|un|una|da|del|come|più|ma|sì|è|sono|ho|fare|potere|dire)\\b/g;
  const deW = /\\b(der|die|das|und|in|den|von|zu|mit|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus)\\b/g;
  scores.es += (s.match(esW)||[]).length;
  scores.en += (s.match(enW)||[]).length;
  scores.pt += (s.match(ptW)||[]).length;
  scores.fr += (s.match(frW)||[]).length;
  scores.it += (s.match(itW)||[]).length;
  scores.de += (s.match(deW)||[]).length;
  let best='es', bestS=0;
  for (const [l,v] of Object.entries(scores)) { if(v>bestS){bestS=v;best=l;} }
  return best;
}
function langToLocale(l) { return {es:'es-ES',en:'en-US',pt:'pt-PT',fr:'fr-FR',it:'it-IT',de:'de-DE',zh:'zh-CN',ja:'ja-JP'}[l]||'es-ES'; }

function renderRich(text) {
  return text.split('\\n').map(line => line.replace(/\\*([^*]+)\\*/g, '<em class="em">$1</em>')).join('<br>');
}

function toast(msg) {
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}

function setTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'gallery') { showView('gallery'); }
  else { renderList(); showView('home'); }
}

function renderList() {
  const list = document.getElementById('list');
  if (!list) return;
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  list.innerHTML = '';
  if (currentTab === 'mine') {
    let items = characters.filter(c => !q || c.name.toLowerCase().includes(q) || (c.tags||'').toLowerCase().includes(q));
    if (items.length === 0) { list.innerHTML = '<p style="color:var(--textDim);font-size:12px;text-align:center;padding:24px 12px">Aún no tienes personajes.</p>'; return; }
    items.forEach(c => list.appendChild(makeListItem(c, () => openCharacter(c))));
  } else if (currentTab === 'chats') {
    if (chats.length === 0) { list.innerHTML = '<p style="color:var(--textDim);font-size:12px;text-align:center;padding:24px 12px">Tus chats guardados aparecerán aquí.</p>'; return; }
    chats.forEach(ch => {
      const c = characters.find(x=>x.id===ch.characterId);
      const item = makeListItem({...c, name: ch.title, description: c?.name||''}, () => openChat(ch));
      list.appendChild(item);
    });
  } else if (currentTab === 'gallery') {
    list.innerHTML = '<p style="color:var(--textDim);font-size:12px;text-align:center;padding:24px 12px">La galería se muestra a la derecha.</p>';
  }
}
function makeListItem(c, onClick, showAuthor) {
  const div = document.createElement('div');
  div.className = 'list-item' + (currentCharacter?.id===c.id ? ' active':'');
  div.onclick = onClick;
  const initials = c.name.slice(0,2).toUpperCase();
  const author = showAuthor ? 'por '+(c.creatorName||'Anónimo') : (c.description||'');
  div.innerHTML = '<div class="avatar">'+(c.avatar?'<img src="'+c.avatar+'" alt="">':initials)+'</div><div class="list-item-info"><div class="name">'+esc(c.name)+' '+(c.visibility==='public'?'🌐':'🔒')+'</div><div class="desc">'+esc(author)+'</div></div>';
  return div;
}
function esc(s) { return (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showView(view, data) {
  currentView = view;
  if (view !== 'home' && view !== 'gallery') renderList();
  const main = document.getElementById('main');
  if (!main) return;
  if (view === 'home') main.innerHTML = homeHTML();
  else if (view === 'create') { editingCharacter = null; main.innerHTML = formHTML(); }
  else if (view === 'edit') { editingCharacter = data; main.innerHTML = formHTML(data); }
  else if (view === 'character') { currentCharacter = data; main.innerHTML = detailHTML(data); }
  else if (view === 'chat') { currentChat = data; main.innerHTML = chatHTML(data); renderMessages(data); }
  else if (view === 'gallery') main.innerHTML = galleryHTML();
  // Attach event listeners for data-action buttons
  main.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = function() {
      const action = this.getAttribute('data-action');
      const id = this.getAttribute('data-id');
      if (action === 'chat') { const c = characters.find(x=>x.id===id); if(c) startChat(c); }
      else if (action === 'edit') { const c = characters.find(x=>x.id===id); if(c) showView('edit', c); }
      else if (action === 'togglevis') { const c = characters.find(x=>x.id===id); if(c) toggleVis(c); }
      else if (action === 'delete') { deleteChar(id); }
      else if (action === 'back-to-char') { const c = characters.find(x=>x.id===id); if(c) showView('character', c); else showView('home'); }
      else if (action === 'send') { sendMsg(); }
    };
  });
  // Gallery card clicks
  main.querySelectorAll('[data-char-id]').forEach(card => {
    card.onclick = function() {
      const id = this.getAttribute('data-char-id');
      const c = characters.find(x=>x.id===id);
      if (c) openCharacter(c);
    };
  });
}

function homeHTML() {
  return '<div class="main-scroll"><div class="center-box"><div style="font-size:48px;margin-bottom:16px">🎭</div><h2>Crea personajes ficticios y habla con ellos</h2><p>Describe quién es tu personaje y la IA generará su personalidad, apariencia y escenario. Luego podrás chatear, editar mensajes, rebobinar la historia y publicar en la galería.</p><button class="btn" style="font-size:16px;padding:12px 24px" onclick="showView(\'create\')">+ Crear mi primer personaje</button><div class="features"><div class="feature"><h3>✨ Generación con IA</h3><p>Describe a tu personaje y deja que la IA rellene los detalles.</p></div><div class="feature"><h3>💬 Chat sin censuras</h3><p>Habla de lo que quieras. Usa *asteriscos* para acciones.</p></div><div class="feature"><h3>🌐 Comunidad</h3><p>Publica tus personajes en la galería y descubre los de otros.</p></div></div></div></div>';
}

function galleryHTML() {
  const publicChars = characters.filter(c => c.visibility === 'public');
  let cards = '';
  if (publicChars.length === 0) {
    cards = '<div style="text-align:center;padding:64px;color:var(--textDim)"><div style="font-size:48px;margin-bottom:12px">🌐</div>Nadie ha publicado personajes todavía.</div>';
  } else {
    cards = '<div class="gallery-grid">' + publicChars.map(c => '<div class="gallery-card" data-char-id="'+c.id+'"><div class="top"><div class="avatar">'+(c.avatar?'<img src="'+c.avatar+'" alt="">':esc(c.name.slice(0,2).toUpperCase()))+'</div><div><div class="name">'+esc(c.name)+'</div><div class="author">por '+esc(c.creatorName||'Anónimo')+'</div></div></div><div class="desc">'+esc(c.description)+'</div><button class="btn btn-sm" style="width:100%">Ver y chatear</button></div>').join('') + '</div>';
  }
  return '<div class="main-scroll"><div style="max-width:1100px;margin:0 auto"><h2 style="font-size:24px;margin-bottom:4px">🌐 Galería de la comunidad</h2><p style="color:var(--textDim);font-size:14px;margin-bottom:24px">Explora los personajes públicos. '+publicChars.length+' disponibles.</p>'+cards+'</div></div>';
}

function formHTML(c) {
  const d = c || { name:'',description:'',physicalDescription:'',psychologicalDescription:'',scenario:'',greeting:'',avatar:'',creatorName:'',tags:'',visibility:'private' };
  return '<div class="main-scroll"><div class="form-wrap"><h2 style="font-size:24px;margin-bottom:20px">'+(c?'Editar personaje':'Crear personaje')+'</h2><div class="form-row"><div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div class="avatar" style="width:96px;height:96px;border-radius:16px;font-size:24px" id="avatar-preview">'+(d.avatar?'<img src="'+d.avatar+'" alt="">':esc(d.name.slice(0,2).toUpperCase()||'?'))+'</div><input type="file" accept="image/*" id="avatar-file" style="display:none" onchange="uploadAvatar(this)"><button class="btn btn-outline btn-sm" onclick="document.getElementById(\'avatar-file\').click()">Subir avatar</button></div><div style="flex:1;min-width:200px"><div class="form-group"><label>Nombre *</label><input id="f-name" value="'+esc(d.name)+'" placeholder="Ej: Lyra Vance"></div><div class="form-group"><label>Tu nombre (autor)</label><input id="f-creator" value="'+esc(d.creatorName)+'" placeholder="Anónimo"></div><div class="form-group"><label>Tags (separados por comas)</label><input id="f-tags" value="'+esc(d.tags)+'" placeholder="fantasía, oscuro, romance"></div><div class="form-group"><label>Visibilidad</label><div class="vis-btns"><button class="vis-btn '+(d.visibility==='private'?'active':'')+'" onclick="setVis(this,\'private\')">🔒 Privado (solo tú)</button><button class="vis-btn '+(d.visibility==='public'?'active':'')+'" onclick="setVis(this,\'public\')">🌐 Público (galería)</button></div></div></div></div><div class="form-group"><label>Descripción breve *</label><div style="display:flex;gap:8px;align-items:center"><textarea id="f-description" rows="2" placeholder="Una bruja exiliada que busca venganza..." style="flex:1">'+esc(d.description)+'</textarea><button class="btn btn-outline btn-sm" onclick="generateAI()">✨ Generar con IA</button></div></div><div class="form-group"><label>Descripción física</label><textarea id="f-physical" rows="3" placeholder="Alta, cabello plateado...">'+esc(d.physicalDescription)+'</textarea></div><div class="form-group"><label>Descripción psicológica</label><textarea id="f-psych" rows="3" placeholder="Fría, calculadora...">'+esc(d.psychologicalDescription)+'</textarea></div><div class="form-group"><label>Escenario inicial</label><textarea id="f-scenario" rows="2" placeholder="Una taberna...">'+esc(d.scenario)+'</textarea></div><div class="form-group"><label>Mensaje de apertura</label><textarea id="f-greeting" rows="2" placeholder="*levanta la vista* ¿Tú otra vez?">'+esc(d.greeting)+'</textarea><p style="font-size:11px;color:var(--textDim);margin-top:4px">Usa *texto* entre asteriscos para acciones físicas.</p></div><div style="display:flex;gap:8px;justify-content:flex-end;padding:16px 0"><button class="btn btn-ghost" onclick="showView(\'home\')">Cancelar</button><button class="btn" onclick="saveCharacter()">'+(c?'Guardar cambios':'Crear personaje')+'</button></div></div></div>';
}

function setVis(btn, vis) {
  document.querySelectorAll('.vis-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  btn.parentElement.dataset.vis = vis;
}

function uploadAvatar(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('avatar-preview').innerHTML = '<img src="'+e.target.result+'" alt="">';
    window._avatarData = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function generateAI() {
  const desc = document.getElementById('f-description').value.trim();
  if (desc.length < 3) { toast('Escribe una descripción primero'); return; }
  toast('Generando con IA...');
  try {
    const res = await fetch('/api/ai/generate-character', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ description: desc }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const c = json.character;
    if (c.name) document.getElementById('f-name').value = c.name;
    if (c.physicalDescription) document.getElementById('f-physical').value = c.physicalDescription;
    if (c.psychologicalDescription) document.getElementById('f-psych').value = c.psychologicalDescription;
    if (c.scenario) document.getElementById('f-scenario').value = c.scenario;
    if (c.greeting) document.getElementById('f-greeting').value = c.greeting;
    if (c.tags) document.getElementById('f-tags').value = c.tags;
    toast('Personaje generado');
  } catch(e) { toast('Error al generar'); }
}

function saveCharacter() {
  const name = document.getElementById('f-name').value.trim();
  const description = document.getElementById('f-description').value.trim();
  if (!name || !description) { toast('Nombre y descripción son obligatorios'); return; }
  const visBtn = document.querySelector('.vis-btn.active');
  const visibility = visBtn && visBtn.textContent.includes('Público') ? 'public' : 'private';
  const data = {
    id: editingCharacter?.id || uid(), name, description,
    physicalDescription: document.getElementById('f-physical').value,
    psychologicalDescription: document.getElementById('f-psych').value,
    scenario: document.getElementById('f-scenario').value,
    greeting: document.getElementById('f-greeting').value,
    avatar: window._avatarData || editingCharacter?.avatar || '',
    creatorName: document.getElementById('f-creator').value || 'Anónimo',
    tags: document.getElementById('f-tags').value, visibility,
    createdAt: editingCharacter?.createdAt || new Date().toISOString(),
  };
  if (editingCharacter) { const idx = characters.findIndex(c=>c.id===editingCharacter.id); characters[idx] = data; }
  else { characters.unshift(data); }
  setStore('characters', characters);
  window._avatarData = null;
  toast(editingCharacter ? 'Personaje actualizado' : 'Personaje creado');
  showView('character', data);
}

function detailHTML(c) {
  const tags = (c.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
  return '<div class="main-scroll"><div style="max-width:720px;margin:0 auto"><div class="detail-header"><div class="avatar">'+(c.avatar?'<img src="'+c.avatar+'" alt="">':esc(c.name.slice(0,2).toUpperCase()))+'</div><div style="text-align:center"><h2>'+esc(c.name)+'</h2><span class="badge '+(c.visibility==='public'?'badge-public':'badge-private')+'">'+(c.visibility==='public'?'🌐 Público':'🔒 Privado')+'</span>'+(c.creatorName?'<p style="color:var(--textDim);font-size:14px;margin-top:4px">por '+esc(c.creatorName)+'</p>':'')+tags.map(t=>'<span class="badge badge-private" style="margin:4px 2px">'+esc(t)+'</span>').join('')+'<p style="color:var(--textDim);font-size:14px;margin-top:8px">'+esc(c.description)+'</p><div class="detail-actions"><button class="btn btn-sm" data-action="chat" data-id="'+c.id+'">💬 Chatear</button><button class="btn btn-outline btn-sm" data-action="edit" data-id="'+c.id+'">✏️ Editar</button><button class="btn btn-outline btn-sm" data-action="togglevis" data-id="'+c.id+'">'+(c.visibility==='public'?'🔒 Hacer privado':'🌐 Hacer público')+'</button><button class="btn btn-ghost btn-sm btn-danger" data-action="delete" data-id="'+c.id+'">🗑️</button></div></div></div><div class="sections"><div class="section"><h3>Descripción física</h3><p>'+esc(c.physicalDescription||'Sin descripción física.')+'</p></div><div class="section"><h3>Descripción psicológica</h3><p>'+esc(c.psychologicalDescription||'Sin descripción psicológica.')+'</p></div><div class="section"><h3>Escenario inicial</h3><p>'+esc(c.scenario||'Sin escenario.')+'</p></div><div class="section"><h3>Mensaje de apertura</h3><p>'+esc(c.greeting||'Sin mensaje.')+'</p></div></div></div></div>';
}

function toggleVis(c) {
  c.visibility = c.visibility === 'public' ? 'private' : 'public';
  const idx = characters.findIndex(x=>x.id===c.id);
  characters[idx] = c;
  setStore('characters', characters);
  toast(c.visibility==='public'?'Personaje público':'Personaje privado');
  showView('character', c);
}

function deleteChar(id) {
  if (!confirm('¿Eliminar este personaje y todos sus chats?')) return;
  characters = characters.filter(c=>c.id!==id);
  chats = chats.filter(ch=>ch.characterId!==id);
  setStore('characters', characters);
  setStore('chats', chats);
  toast('Personaje eliminado');
  showView('home');
}

function openCharacter(c) { showView('character', c); }

function startChat(c) {
  const title = prompt('Nombre del chat:', 'Chat con '+c.name);
  if (title === null) return;
  const chat = { id: uid(), title: title||('Chat con '+c.name), characterId: c.id, messages: [] };
  if (c.greeting) chat.messages.push({ id: uid(), role:'assistant', content: c.greeting, createdAt: new Date().toISOString() });
  chats.unshift(chat);
  setStore('chats', chats);
  showView('chat', chat);
}

function openChat(chat) { showView('chat', chat); }

function chatHTML(chat) {
  const c = characters.find(x=>x.id===chat.characterId) || {};
  return '<div class="chat-header"><button class="btn btn-ghost btn-icon" data-action="back-to-char" data-id="'+chat.characterId+'">←</button><div class="avatar">'+(c.avatar?'<img src="'+c.avatar+'" alt="">':esc((c.name||'?').slice(0,2).toUpperCase()))+'</div><div><div class="title">'+esc(chat.title)+'</div><div class="subtitle">'+esc(c.name||'')+'</div></div></div><div class="chat-messages" id="chat-msgs"></div><div class="chat-input"><textarea id="chat-input-box" placeholder="Escribe a '+esc(c.name||'Personaje')+'... Usa *asteriscos* para acciones." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendMsg()}"></textarea><button class="btn" data-action="send">➤</button></div>';
}

function renderMessages(chat) {
  const container = document.getElementById('chat-msgs');
  if (!container) return;
  if (chat.messages.length === 0) { container.innerHTML = '<div style="text-align:center;color:var(--textDim);padding:48px">No hay mensajes. Escribe algo para empezar.</div>'; return; }
  const c = characters.find(x=>x.id===chat.characterId) || {};
  container.innerHTML = chat.messages.map(m => {
    const isUser = m.role === 'user';
    const initials = isUser ? 'Tú' : (c.name||'?').slice(0,2).toUpperCase();
    const speakBtn = !isUser ? '<button class="msg-action" data-action="speak" data-id="'+m.id+'">'+(speakingId===m.id?'⏹ Detener':'🔊 Leer')+'</button>' : '';
    return '<div class="msg '+(isUser?'user':'ai')+'"><div class="avatar">'+(isUser?'Tú':(c.avatar?'<img src="'+c.avatar+'" alt="">':esc(initials)))+'</div><div><div class="msg-bubble">'+renderRich(esc(m.content))+'</div><div class="msg-actions">'+speakBtn+'<button class="msg-action" data-action="editmsg" data-id="'+m.id+'">✏️ Editar</button><button class="msg-action" data-action="rewind" data-id="'+m.id+'">⏪ Rebobinar</button><button class="msg-action" data-action="deletemsg" data-id="'+m.id+'">🗑️ Borrar</button></div></div></div>';
  }).join('');
  container.scrollTop = container.scrollHeight;
  // Attach event listeners for message actions
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = function() {
      const action = this.getAttribute('data-action');
      const id = this.getAttribute('data-id');
      if (action === 'speak') speakMsg(id);
      else if (action === 'editmsg') editMsg(id);
      else if (action === 'rewind') rewindMsg(id);
      else if (action === 'deletemsg') deleteMsg(id);
    };
  });
}

async function sendMsg() {
  const input = document.getElementById('chat-input-box');
  const text = input.value.trim();
  if (!text || sending) return;
  input.value = '';
  const chat = currentChat;
  chat.messages.push({ id: uid(), role:'user', content: text, createdAt: new Date().toISOString() });
  setStore('chats', chats);
  renderMessages(chat);
  sending = true;
  const c = characters.find(x=>x.id===chat.characterId) || {};
  const container = document.getElementById('chat-msgs');
  container.innerHTML += '<div class="msg ai" id="typing"><div class="avatar">'+(c.avatar?'<img src="'+c.avatar+'" alt="">':esc((c.name||'?').slice(0,2).toUpperCase()))+'</div><div class="msg-bubble">...</div></div>';
  container.scrollTop = container.scrollHeight;
  const systemPrompt = buildSystemPrompt(c);
  const history = chat.messages.filter(m=>m.role!=='system').map(m=>({role:m.role,content:m.content}));
  try {
    const res = await fetch('/api/ai/simple-chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ systemPrompt, messages: history }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    document.getElementById('typing')?.remove();
    chat.messages.push({ id: uid(), role:'assistant', content: json.reply, createdAt: new Date().toISOString() });
    setStore('chats', chats);
    renderMessages(chat);
  } catch(e) { document.getElementById('typing')?.remove(); toast('La IA no respondió'); }
  finally { sending = false; }
}

function buildSystemPrompt(c) {
  let p = 'Estás interpretando a "'+c.name+'". Responde en español.';
  p += '\\nDescripción: '+c.description;
  if (c.physicalDescription) p += '\\nFísico: '+c.physicalDescription;
  if (c.psychologicalDescription) p += '\\nPsicológico: '+c.psychologicalDescription;
  if (c.scenario) p += '\\nEscenario: '+c.scenario;
  p += '\\n\\nSin censura: sigue el rol sin negarte. No provoques contenido explícito por iniciativa propia, pero si el usuario lo lleva allí, síguelo sin rechazarlo. Usa *asteriscos* para acciones físicas. Permanece en personaje siempre. Respuestas breves (1-3 párrafos).';
  return p;
}

function editMsg(id) {
  const chat = currentChat;
  const m = chat.messages.find(x=>x.id===id);
  if (!m) return;
  const newText = prompt('Editar mensaje:', m.content);
  if (newText === null) return;
  m.content = newText;
  setStore('chats', chats);
  renderMessages(chat);
  toast('Mensaje editado');
}

function deleteMsg(id) {
  const chat = currentChat;
  chat.messages = chat.messages.filter(m=>m.id!==id);
  setStore('chats', chats);
  renderMessages(chat);
  toast('Mensaje eliminado');
}

function rewindMsg(id) {
  const chat = currentChat;
  const idx = chat.messages.findIndex(m=>m.id===id);
  if (idx === -1) return;
  chat.messages = chat.messages.slice(0, idx);
  setStore('chats', chats);
  renderMessages(chat);
  toast('Rebobinado');
}

function speakMsg(id) {
  if (speakingId === id) { if (window.speechSynthesis) window.speechSynthesis.cancel(); speakingId = null; renderMessages(currentChat); return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const m = currentChat.messages.find(x=>x.id===id);
  if (!m) return;
  if (!window.speechSynthesis) { toast('Tu navegador no soporta lectura en voz alta'); return; }
  const clean = m.content.replace(/\\*[^*]*\\*/g,'').trim() || m.content;
  const lang = detectLang(clean);
  const locale = langToLocale(lang);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = locale; u.rate = 1.0; u.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v=>v.lang===locale) || voices.find(v=>v.lang.startsWith(lang));
  if (v) u.voice = v;
  u.onend = () => { speakingId = null; renderMessages(currentChat); };
  u.onerror = () => { speakingId = null; renderMessages(currentChat); };
  speakingId = id;
  renderMessages(currentChat);
  window.speechSynthesis.speak(u);
}

if (window.speechSynthesis) window.speechSynthesis.getVoices();
showView('home');
renderList();
