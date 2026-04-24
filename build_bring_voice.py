"""
Clean build script for Bring Your Own Voice feature.
Applies all changes to index.html and serve.js in the correct order.
"""
import re

# ============================================================
# PART 1: Fix index.html
# ============================================================
html = open('index.html', 'rb').read()

# 1a. Fix the onclick - change window.openBringVoiceModal to just openBringVoiceModal
html = html.replace(
    b'onclick="window.openBringVoiceModal();return false;"',
    b'onclick="openBringVoiceModal();return false;"'
)

# 1b. Find where to insert the modal (before <!-- Billing Screen -->)
billing_marker = b'<!-- Billing Screen -->'
billing_pos = html.find(billing_marker)

# 1c. Find where to insert JS functions (before function openCreateVoiceModal)
create_voice_marker = b'function openCreateVoiceModal()'
cv_pos = html.find(create_voice_marker)

modal_html = b'''<!-- Bring Your Own Voice Modal -->
<div id="bring-voice-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:var(--bg-card);border-radius:16px;padding:32px;max-width:480px;width:90%;border:1px solid var(--border);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="margin:0;font-size:18px;color:var(--text);">Bring Your Own Voice</h3>
      <span onclick="closeBringVoiceModal()" style="cursor:pointer;font-size:24px;color:var(--text-muted);line-height:1;">&times;</span>
    </div>
    <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px;">Upload a voice recording (WAV, MP3, or FLAC, max 10MB).</p>
    <div style="margin-bottom:16px;">
      <input type="file" id="bring-voice-file" accept=".wav,.mp3,.flac,audio/*" onchange="handleBringVoiceFile(this)" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;box-sizing:border-box;">
    </div>
    <div id="bring-voice-preview" style="display:none;margin-bottom:16px;">
      <audio id="bring-voice-audio" controls style="width:100%;height:40px;"></audio>
    </div>
    <div style="margin-bottom:16px;">
      <input type="text" id="bring-voice-name-input" placeholder="Voice name (e.g. My Voice)" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;box-sizing:border-box;">
    </div>
    <div id="bring-voice-error" style="display:none;color:#e74c3c;font-size:13px;margin-bottom:12px;"></div>
    <div style="display:flex;gap:10px;">
      <button onclick="closeBringVoiceModal()" style="flex:1;padding:12px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--text);font-size:14px;cursor:pointer;">Cancel</button>
      <button id="bring-voice-save-btn" onclick="saveBringVoice()" style="flex:1;padding:12px;border:none;border-radius:8px;background:var(--primary);color:white;font-size:14px;cursor:pointer;font-weight:600;">Save Voice</button>
    </div>
  </div>
</div>
'''

js_functions = b'''function openBringVoiceModal() {
  if (!userState.email) { openAuthModal(); return; }
  document.getElementById('bring-voice-modal').style.display = 'flex';
  document.getElementById('bring-voice-file').value = '';
  document.getElementById('bring-voice-preview').style.display = 'none';
  document.getElementById('bring-voice-name-input').value = '';
  document.getElementById('bring-voice-error').style.display = 'none';
}

function closeBringVoiceModal() {
  document.getElementById('bring-voice-modal').style.display = 'none';
}

function handleBringVoiceFile(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    document.getElementById('bring-voice-error').textContent = 'File too large. Max 10MB.';
    document.getElementById('bring-voice-error').style.display = 'block';
    input.value = '';
    return;
  }
  document.getElementById('bring-voice-error').style.display = 'none';
  var audio = document.getElementById('bring-voice-audio');
  audio.src = URL.createObjectURL(file);
  document.getElementById('bring-voice-preview').style.display = 'block';
}

function saveBringVoice() {
  var file = document.getElementById('bring-voice-file').files[0];
  var name = document.getElementById('bring-voice-name-input').value.trim();
  var error = document.getElementById('bring-voice-error');
  var btn = document.getElementById('bring-voice-save-btn');
  if (!file) { error.textContent = 'Please select an audio file.'; error.style.display = 'block'; return; }
  if (!name) { error.textContent = 'Please enter a voice name.'; error.style.display = 'block'; return; }
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  var formData = new FormData();
  formData.append('audio', file);
  formData.append('name', name);
  fetch('/api/upload-voice', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + userState.token },
    body: formData
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) throw new Error(data.error);
    closeBringVoiceModal();
    loadPrivateVoices();
    alert('Voice uploaded! Select it from "My Voices" to use it.');
  }).catch(function(err) {
    error.textContent = err.message || 'Upload failed. Please try again.';
    error.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Save Voice';
  });
}

function loadPrivateVoices() {
  if (!userState.token) return;
  fetch('/api/my-voices', {
    headers: { 'Authorization': 'Bearer ' + userState.token }
  }).then(function(r) { return r.json(); }).then(function(voices) {
    if (!Array.isArray(voices)) return;
    localStorage.setItem('private_voices', JSON.stringify(voices.map(function(v) { return Object.assign({}, v, { key: 'private_' + v.id }); })));
  }).catch(function() {});
}

'''

# Insert modal HTML before billing
html = html[:billing_pos] + modal_html + html[billing_pos:]

# Recalculate cv_pos after insertion (billing was before it, so pos is unchanged)
# Insert JS functions before openCreateVoiceModal
html = html[:cv_pos] + js_functions + html[cv_pos:]

open('index.html', 'wb').write(html)
print('index.html done! Length:', len(html))

# ============================================================
# PART 2: Fix serve.js - add upload-voice and my-voices endpoints
# ============================================================
serve = open('serve.js', 'rb').read()

# Find the "// Serve static files" marker
static_marker = b'  // Serve static files'
static_pos = serve.find(static_marker)

upload_endpoint = b'''  // API: Upload voice (Bring Your Own Voice)
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/upload-voice') {
    var authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    var token = authHeader.split(' ')[1];
    var chunks = [];
    incomingReq.on('data', function(c) { chunks.push(c); });
    incomingReq.on('end', function() {
      var body = Buffer.concat(chunks);
      fetch('${SUPABASE_URL}/auth/v1/user', {
        headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_SERVICE_KEY }
      }).then(function(userRes) {
        if (!userRes.ok) throw new Error('Invalid token');
        return userRes.json();
      }).then(function(userData) {
        var email = userData.email;
        if (!email) throw new Error('No email found');
        var boundary = ((incomingReq.headers['content-type'] || '').split('boundary=')[1] || '');
        var parts = parseMultipart(body, boundary);
        var filePart = null, namePart = null;
        for (var k in parts) {
          if (parts[k].filename && parts[k].name === 'audio') filePart = parts[k];
          if (parts[k].name === 'name') namePart = parts[k];
        }
        if (!filePart || !namePart) throw new Error('Missing audio or name');
        var ext = (filePart.filename || 'wav').split('.').pop() || 'wav';
        var storagePath = 'private/' + email.replace(/[^a-zA-Z0-9]/g,'_') + '/' + Date.now() + '.' + ext;
        return fetch(SUPABASE_URL + '/storage/v1/object/voices/' + storagePath, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': filePart.type || 'audio/wav', 'x-upsert': 'true' },
          body: filePart.data
        }).then(function(r) {
          if (!r.ok) throw new Error('Storage upload failed');
          return fetch(SUPABASE_URL + '/rest/v1/private_voices', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ user_id: email, name: namePart.data.toString(), audio_url: SUPABASE_URL + '/storage/v1/object/public/voices/' + storagePath, uses: 0 })
          });
        }).then(function(r) {
          if (!r.ok) throw new Error('Database insert failed');
          serverRes.writeHead(200, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ success: true }));
        });
      }).catch(function(e) {
        console.error('Upload error:', e);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: e.message }));
      });
    });
    return;
  }

  // API: Get my private voices
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/my-voices') {
    var authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    var token = authHeader.split(' ')[1];
    fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_SERVICE_KEY }
    }).then(function(r) {
      if (!r.ok) throw new Error('Invalid token');
      return r.json();
    }).then(function(userData) {
      var email = userData.email;
      var req = https.request({
        hostname: 'kxnqwpavjhiphgvkevvj.supabase.co',
        path: '/rest/v1/private_voices?user_id=eq.' + encodeURIComponent(email) + '&select=*',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY }
      }, function(res) {
        var d = ''; res.on('data', function(c) { d += c; });
        res.on('end', function() {
          try { serverRes.writeHead(200, { 'Content-Type': 'application/json' }); serverRes.end(d); }
          catch(e) { serverRes.writeHead(200, { 'Content-Type': 'application/json' }); serverRes.end('[]'); }
        });
      });
      req.on('error', function() { serverRes.writeHead(200, { 'Content-Type': 'application/json' }); serverRes.end('[]'); });
      req.end();
    }).catch(function() {
      serverRes.writeHead(401, { 'Content-Type': 'application/json' });
      serverRes.end(JSON.stringify({error:'Unauthorized'}));
    });
    return;
  }

'''

serve = serve[:static_pos] + upload_endpoint + serve[static_pos:]
open('serve.js', 'wb').write(serve)
print('serve.js done! Length:', len(serve))
print('All done!')
