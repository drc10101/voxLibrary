content = open('index.html', 'rb').read()
# Fix CSS pseudo-element content
old1 = b"content: ' \xc3\xa2\xc5\x93\xe2\x80\x9c';"
new1 = b"content: ' -';"
if old1 in content:
    content = content.replace(old1, new1)
    print('Fixed CSS')

# Fix JS string with smart quote
old2 = b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c'
new2 = b'"'
if old2 in content:
    content = content.replace(old2, new2)
    print('Fixed JS string')

open('index.html', 'wb').write(content)
