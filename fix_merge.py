content = open('serve.js', 'rb').read()

# Find the exact merged line
idx = content.find(b"};  // API: Upload voice")
print('Found at:', idx)
if idx >= 0:
    print('Before:', repr(content[idx-5:idx+50]))
    content = content[:idx+2] + b'\n  ' + content[idx+2:]
    open('serve.js', 'wb').write(content)
    print('Fixed!')
else:
    print('Not found')
