content = open('serve.js', 'rb').read()

# Fix the broken };  // line
old = b'};  // API: Upload voice (Bring Your Own Voice)'
new = b"};\n\n  // API: Upload voice (Bring Your Own Voice)"

if old in content:
    content = content.replace(old, new)
    print('Fixed broken }; line')
else:
    print('Pattern not found, trying alternate...')
    # Try without the extra space
    idx = content.find(b'};  // API')
    print('Found at:', idx)
    if idx >= 0:
        content = content[:idx+2] + b'\n' + content[idx+2:]
        print('Fixed with alternate method')

# Also remove the duplicate my-voices handler (second occurrence)
first = content.find(b"  // API: Get my private voices\n")
print('First my-voices at:', first)
# Find second occurrence
second_search = content.find(b"  // API: Get my private voices\n", first + 10)
print('Second my-voices at:', second_search)
if second_search >= 0:
    # Find the Serve static files comment after second
    static_idx = content.find(b"  // Serve static files", second_search)
    print('Static files at:', static_idx)
    if static_idx >= 0:
        content = content[:second_search] + content[static_idx:]
        print('Removed duplicate my-voices handler')

open('serve.js', 'wb').write(content)
print('Done! Length:', len(content))
