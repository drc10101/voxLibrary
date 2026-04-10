content = open('index.html', 'rb').read()
old = b'\xc3\xa2\xe2\x80\xa0\xc2\x90</button>'
new_val = b'</button>'
if old in content:
    content = content.replace(old, new_val)
    print('Fixed last garbled button')
open('index.html', 'wb').write(content)
