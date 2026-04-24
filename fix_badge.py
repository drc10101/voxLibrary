content = open('index.html', 'rb').read()
# The garbled bytes on line 1946
old = b'<span class="selected-badge">\xc3\xa2\xc5\x93\xe2\x80\x9c Selected</span>'
new_val = b'<span class="selected-badge" style="color:var(--accent);font-size:11px;">&#10003; Selected</span>'
if old in content:
    content = content.replace(old, new_val)
    print('Fixed!')
else:
    print('Not found')
open('index.html', 'wb').write(content)
