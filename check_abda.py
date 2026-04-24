import subprocess
html = subprocess.run(['git', 'show', 'abda05d:index.html'], capture_output=True, text=True, cwd='.').stdout

browse_start = html.find('id="browse-section"')
search_from = browse_start + 200
count = 0
i = search_from
while i < len(html):
    if html[i:i+6] == '</div>':
        count += 1
        if count == 3:
            browse_end = i
            break
        i += 6
    else:
        i += 1

print('BROWSE SECTION:')
print(repr(html[browse_start:browse_end+6]))
print()
print('Length:', browse_end - browse_start)
