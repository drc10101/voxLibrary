content = open('index.html', 'rb').read()

# Fix success-icon
old1 = b'>\xc3\xa2\xc5\x93\xe2\x80\x9c</div>'
new1 = b'>V</div>'
if old1 in content:
    content = content.replace(old1, new1)
    print('Fixed success-icon')

# Fix upgrade message
old2 = b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c'
new2 = b'"'
if old2 in content:
    content = content.replace(old2, new2)
    print('Fixed upgrade message')

open('index.html', 'wb').write(content)
