content = open('index.html', 'rb').read()

# Fix garbled back buttons and generating text
replacements = [
    (b'\xc3\xa2\xe2\x80\xa0\xc2\x90 Back to Voices', b'Back to Voices'),
    (b'\xc3\xa2\xc2\x8f\xc2\xb3 Generating', b'Generating'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f'Fixed: {repr(old)} -> {repr(new)}')

open('index.html', 'wb').write(content)
