"""
Clean build from abda05d - all changes applied correctly.
"""
import subprocess

# Get base files from git
html = subprocess.run(['git', 'show', 'abda05d:index.html'], capture_output=True, text=True, cwd='.').stdout
serve = subprocess.run(['git', 'show', 'abda05d:serve.js'], capture_output=True, text=True, cwd='.').stdout

print(f"Base HTML: {len(html)} chars, Base serve.js: {len(serve)} chars")

# ==============================================================
# CHANGE 1: Restructure browse-section to contain community voices
# Old: browse-section closes -> standalone community section -> create button
# New: browse-section closes -> create button (both buttons side by side)
# Community voices section MOVED inside browse-section (before browse's closing </div>)
# ==============================================================

# Step 1A: Find browse-section's voice-grid, insert community section inside before browse closes
voice_grid_end = html.find('<div class="voice-grid" id="voice-grid"></div>')
# The voice-grid div ends at '</div>', find the closing div of voice-grid
vg_close = html.find('</div>', voice_grid_end)
# Then the next </div> is browse-section's closing
browse_close = html.find('</div>', vg_close + 6)

# Insert community voices section before browse-section's closing </div>
new_community_inside_browse = '''
    <!-- Community Voices - inside browse section -->
    <div id="community-voices-section" style="margin-top: 24px;">
      <div class="section-title" style="font-size:18px;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700;">Community Voices</div>
      <div class="voice-grid" id="community-voices-grid"></div>
    </div>
  </div>

  <!-- Action Buttons Row (side by side) -->
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;padding:16px;">
    <a href="#" onclick="openBringVoiceModal();return false;" style="color:#818cf8;font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;padding:10px 20px;border:1px solid rgba(99,102,241,0.4);border-radius:10px;background:rgba(99,102,241,0.1);">
      Bring your own voice file
    </a>
    <a href="#" onclick="openCreateVoiceModal();return false;" style="color:#818cf8;font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;padding:10px 20px;border:1px solid rgba(99,102,241,0.4);border-radius:10px;background:rgba(99,102,241,0.1);">
      + Create your own voice clone
    </a>
  </div>

'''

html = html[:browse_close] + new_community_inside_browse + html[browse_close:]
print(f"After restructure: {len(html)}")

# ==============================================================
# CHANGE 2: Remove old standalone community section + create button
# (they're now obsolete since we moved community inside browse)
# ==============================================================
# The old standalone community section starts with:
old_standalone = '<!-- Community Voices -->\n<div class="section" id="community-voices-section"'
old_pos = html.find(old_standalone)
if old_pos >= 0:
    # Find where it ends - next is <!-- Create Voice Modal
    next_modal = html.find('<!-- Create Voice Modal', old_pos)
    html = html[:old_pos] + html[next_modal:]
    print(f"After removing old standalone: {len(html)}")
else:
    print("Old standalone not found (already removed)")

# ==============================================================
# CHANGE 3: Add Bring Your Own Voice modal HTML (before Billing Screen)
# ==============================================================
bring_modal = '''
<!-- Bring Your Own Voice Modal -->
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
billing_marker = '<!-- Billing Screen -->'
html = html.replace(billing_marker, bring_modal + '\n' + billing_marker)
print(f"After bring modal: {len(html)}")

# ==============================================================
# CHANGE 4: Add email section with checkbox to download screen
# ==============================================================
old_dl = '''    <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;" id="download-info"></div>
  </div>

  <div class="download-btns" style="margin-top: 20px;">
    <button class="btn btn-primary" onclick="downloadFile()">Download</button>
    <button class="btn btn-ghost" onclick="showBrowse()">Generate Another</button>
  </div>
</div>'''

new_dl = '''    <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;" id="download-info"></div>
  </div>

  <!-- Email section - only shown for community voices -->
  <div id="email-section" style="display:none; margin-top: 20px; padding: 16px; background: rgba(99,102,241,0.1); border-radius: 12px; border: 1px solid rgba(99,102,241,0.3);">
    <p style="color: var(--text); font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Email your audio instead</p>
    <div style="margin-bottom: 10px;">
      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
        <input type="checkbox" id="email-use-private-checkbox" onchange="toggleEmailPrivate()">
        <span id="email-private-label">I want to keep this voice private ($9.99)</span>
      </label>
    </div>
    <div id="email-form-area" style="display:none;">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
        <input type="email" id="email-audio-input" placeholder="your@email.com" style="flex: 1; min-width: 160px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); font-size: 14px;">
        <button class="btn btn-primary" id="email-audio-btn" onclick="emailAudioFile()">Send Email</button>
      </div>
      <div id="email-audio-status" style="font-size: 13px; color: var(--text-muted);"></div>
    </div>
  </div>

  <div class="download-btns" style="margin-top: 20px;">
    <button class="btn btn-primary" onclick="downloadFile()">Download</button>
    <button class="btn btn-ghost" onclick="showBrowse()">Generate Another</button>
  </div>
</div>'''

html = html.replace(old_dl, new_dl)
print(f"After email section: {len(html)}")

# ==============================================================
# CHANGE 5: Update generation button text to "This may take a minute"
# ==============================================================
html = html.replace("btn.textContent = 'Processing...';", "btn.textContent = 'This may take a minute...';")
print(f"After button text: {len(html)}")

# ==============================================================
# CHANGE 6: Add email section visibility JS in generateAudio success
# ==============================================================
old_prefill = '''    // Pre-fill email if logged in
    if (userState.email) {
      document.getElementById('email-audio-input').value = userState.email;
    }

    document.getElementById('char-count').textContent'''

new_email_js = '''    // Show/hide email section for community voices only
    var isCommunityVoice = selectedVoice && (
      selectedVoice.voice_id ||
      (selectedVoice.key && !voices.find(function(v){ return v.id === selectedVoice.id; }))
    );
    var emailSection = document.getElementById('email-section');
    var emailFormArea = document.getElementById('email-form-area');
    var privateCheckbox = document.getElementById('email-use-private-checkbox');
    if (isCommunityVoice) {
      emailSection.style.display = 'block';
      emailFormArea.style.display = 'none';
      privateCheckbox.checked = false;
      if (userState.email) {
        document.getElementById('email-audio-input').value = userState.email;
      } else {
        document.getElementById('email-audio-input').value = '';
      }
    } else {
      emailSection.style.display = 'none';
    }

    document.getElementById('char-count').textContent'''

html = html.replace(old_prefill, new_email_js)
print(f"After email JS: {len(html)}")

# ==============================================================
# CHANGE 7: Add JS functions before openCreateVoiceModal
# ==============================================================
new_js = '''
function openBringVoiceModal() {
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
  }).then(function(r){ return r.json(); }).then(function(data) {
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
  }).then(function(r){ return r.json(); }).then(function(voices) {
    if (!Array.isArray(voices)) return;
    localStorage.setItem('private_voices', JSON.stringify(voices.map(function(v) {
      return Object.assign({}, v, { key: 'private_' + v.id });
    })));
  }).catch(function() {});
}

function toggleEmailPrivate() {
  var checkbox = document.getElementById('email-use-private-checkbox');
  var emailForm = document.getElementById('email-form-area');
  if (checkbox.checked) {
    var email = userState.email || document.getElementById('email-audio-input').value;
    if (!email) {
      checkbox.checked = false;
      alert('Please enter your email address first.');
      return;
    }
    fetch('/api/create-private-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userState.token },
      body: JSON.stringify({ email: email })
    }).then(function(r){ return r.json(); }).then(function(data) {
      if (data.url) { window.location.href = data.url; }
      else { checkbox.checked = false; alert('Could not create checkout. Please try again.'); }
    }).catch(function() { checkbox.checked = false; alert('Could not create checkout. Please try again.'); });
  } else {
    emailForm.style.display = 'none';
  }
}

'''

html = html.replace('function openCreateVoiceModal() {', new_js + '\nfunction openCreateVoiceModal() {')
print(f"After JS functions: {len(html)}")

# ==============================================================
# Write clean files
# ==============================================================
with open('index.html', 'w', encoding='utf-8-sig') as f:
    f.write(html)
print(f"\nindex.html: {len(html)} chars")

# ==============================================================
# CHANGE 8: Add upload-voice and my-voices endpoints to serve.js
# ==============================================================
serve_marker = '  // Serve static files\n'
serve_pos = serve.find(serve_marker)

upload_endpoints = '''  // API: Upload voice (Bring Your Own Voice)
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/upload-voice') {
    var authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    var token = authHeader.split(' ')[1];
    var chunks = [];
    incomingReq.on('data', function(c) { chunks.push(c); });
    incomingReq.on('end', function() {
      var body = Buffer.concat(chunks);
      fetch(SUPABASE_URL + '/auth/v1/user', {
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

serve = serve[:serve_pos] + upload_endpoints + serve[serve_pos:]
with open('serve.js', 'w', encoding='utf-8-sig') as f:
    f.write(serve)
print(f"serve.js: {len(serve)} chars")

# Verify syntax
import os
node_check = os.system('node --check serve.js')
print(f"serve.js syntax check: {'OK' if node_check == 0 else 'FAIL'}")

print("\nAll done!")
