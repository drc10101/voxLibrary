content = open('index.html', 'rb').read()
old = b"btn.textContent = '\xc3\xb0\xc5\xb8\xc5\xbd\xc2\xb5 Generate Audio';\r\n    btn.disabled = false;"
new_val = b"btn.textContent = 'Generate Audio';\r\n    btn.disabled = false;"
if old in content:
    content = content.replace(old, new_val)
    open('index.html', 'wb').write(content)
    print('Fixed JS button text!')
else:
    print('Not found - already clean or different pattern')
    # Show what's actually there
    idx = content.find(b'btn.textContent = ')
    if idx >= 0:
        print('Found at', idx, ':', repr(content[idx:idx+60]))
