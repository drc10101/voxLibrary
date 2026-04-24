content = open('index.html', 'rb').read()

old = b'onclick="openBringVoiceModal();return false;"'

if old in content:
    content = content.replace(old, b'onclick="window.openBringVoiceModal();return false;"')
    open('index.html', 'wb').write(content)
    print('Fixed!')
else:
    print('Not found')
