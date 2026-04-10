content = open('index.html', 'r', encoding='utf-8').read()
# Find and replace the garbled logo div
old = '<div class="logo" onclick="showBrowse()">'
idx = content.find(old)
if idx >= 0:
    end = content.find('</div>', idx)
    old_div = content[idx:end+6]
    print(f"Found: {repr(old_div)}")
    new_div = '<div class="logo" onclick="showBrowse()">VoxLibrary</div>'
    content = content.replace(old_div, new_div)
    open('index.html', 'w', encoding='utf-8').write(content)
    print("Fixed")
else:
    print("Not found")
