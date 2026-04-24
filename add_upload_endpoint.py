content = open('serve.js', 'rb').read()
pos = content.find(b'  // Serve static files')
print('Found at:', pos)

new_endpoints = b'''  // API: Upload voice (Bring Your Own Voice)
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/upload-voice') {
    const authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    const token = authHeader.split(' ')[1];
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_SERVICE_KEY }
    });
    if (!userRes.ok) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Invalid token'})); return; }
    const userData = await userRes.json();
    const email = userData.email;
    if (!email) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'No email found'})); return; }
    const chunks = [];
    incomingReq.on('data', c => chunks.push(c));
    incomingReq.on('end', async () => {
      try {
        const boundary = (incomingReq.headers['content-type'] || '').replace('multipart/form-data; boundary=', '');
        const parts = parseMultipart(Buffer.concat(chunks), boundary);
        const filePart = parts.find(p => p.name === 'audio');
        const namePart = parts.find(p => p.name === 'name');
        if (!filePart || !namePart) { serverRes.writeHead(400); serverRes.end(JSON.stringify({error:'Missing audio or name'})); return; }
        const ext = (filePart.filename || 'wav').split('.').pop() || 'wav';
        const storagePath = `private/${email.replace(/[^a-zA-Z0-9]/g,'_')}/${Date.now()}.${ext}`;
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/voices/${storagePath}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': filePart.type || 'audio/wav', 'x-upsert': 'true' },
          body: filePart.data
        });
        if (!uploadRes.ok) throw new Error('Storage upload failed: ' + await uploadRes.text());
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/voices/${storagePath}`;
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/private_voices`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ user_id: email, name: namePart.data.toString(), audio_url: publicUrl, uses: 0 })
        });
        if (!insertRes.ok) throw new Error('Database insert failed: ' + await insertRes.text());
        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ success: true, url: publicUrl }));
      } catch (e) { console.error('Upload error:', e); serverRes.writeHead(500); serverRes.end(JSON.stringify({ error: e.message })); }
    }); return;
  }

  // API: Get my private voices
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/my-voices') {
    const authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    const token = authHeader.split(' ')[1];
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_SERVICE_KEY }
    });
    if (!userRes.ok) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Invalid token'})); return; }
    const userData = await userRes.json();
    const email = userData.email;
    const voicesData = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'kxnqwpavjhiphgvkevvj.supabase.co',
        path: `/rest/v1/private_voices?user_id=eq.${encodeURIComponent(email)}&select=*`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
      }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } }); });
      req.on('error', e => resolve([]));
      req.end();
    });
    serverRes.writeHead(200, { 'Content-Type': 'application/json' });
    serverRes.end(JSON.stringify(voicesData || []));
    return;
  }

'''

if pos < 0:
    print('ERROR')
else:
    new_content = content[:pos] + new_endpoints + content[pos:]
    open('serve.js', 'wb').write(new_content)
    print('Done! Length:', len(new_content))
