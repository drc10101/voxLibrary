content = open('index.html', 'rb').read()
idx = content.find(b"Pre-fill email if logged in")
inner = content.find(b"email-audio-input').value = userState.email;", idx)
cc = content.find(b"char-count').textContent", inner)
old = content[idx-8:cc]  # include the newline before 'document'
print('Old section:')
print(repr(old))
print()
print('Length:', len(old))
