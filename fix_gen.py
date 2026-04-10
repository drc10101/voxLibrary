content = open('index.html', 'rb').read()

# Fix garbled HTML button
old1 = b'>\xc3\xb0\xc5\xb8\xc5\xbd\xc2\xb5 Generate Audio</button>'
new1 = b'>Generate Audio</button>'
if old1 in content:
    content = content.replace(old1, new1)
    print('Fixed HTML button')

# Fix garbled JS string - find the actual bytes
idx = content.find(b"btn.textContent = '")
if idx >= 0:
    snippet = content[idx:idx+50]
    print('JS context:', repr(snippet))

open('index.html', 'wb').write(content)
