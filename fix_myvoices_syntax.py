content = open('serve.js', 'rb').read()

# Find and fix the my-voices handler - wrap the logic in an async callback
old = b'''  // API: Get my private voices
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
  }'''

new = b'''  // API: Get my private voices
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/my-voices') {
    const authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    const token = authHeader.split(' ')[1];
    (async () => {
      try {
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
      } catch (e) { serverRes.writeHead(500); serverRes.end(JSON.stringify({error:e.message})); }
    })();
    return;
  }'''

if old in content:
    content = content.replace(old, new)
    open('serve.js', 'wb').write(content)
    print('Fixed!')
else:
    print('Pattern not found')
    idx = content.find(b'/api/my-voices')
    print(repr(content[idx:idx+600]))
