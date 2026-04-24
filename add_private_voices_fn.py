content = open('index.html', 'rb').read()

func_marker = b'function openCreateVoiceModal() {'

idx = content.find(func_marker)
print('openCreateVoiceModal at:', idx)
print(repr(content[idx-30:idx+30]))

loadPrivateVoices = b'''function loadPrivateVoices() {
  if (!userState.token) return;
  fetch('/api/my-voices', {
    headers: { 'Authorization': 'Bearer ' + userState.token }
  }).then(r => r.json()).then(voices => {
    if (!Array.isArray(voices)) return;
    localStorage.setItem('private_voices', JSON.stringify(voices.map(v => ({...v, key: 'private_' + v.id}))));
  }).catch(() => {});
}

'''

new_content = content[:idx] + loadPrivateVoices + content[idx:]
open('index.html', 'wb').write(new_content)
print('Done!')
