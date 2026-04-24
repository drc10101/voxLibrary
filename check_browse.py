import subprocess

html = subprocess.run(['git', 'show', 'abda05d:index.html'], capture_output=True, text=True, cwd='.').stdout

# Find browse section
browse_start = html.find('id="browse-section"')
# Find its closing div
search_from = browse_start + 200
count = 0
i = search_from
while i < len(html):
    if html[i:i+6] == '</div>':
        count += 1
        if count == 3:  # 3rd closing div after browse-section start
            browse_end = i
            break
        i += 6
    else:
        i += 1

print('=== ABDA05D BROWSE SECTION ===')
print(repr(html[browse_start:browse_end+6]))
print()
print()

# Find script
script_start = html.find('<script>')
print('=== SCRIPT START ===')
print(repr(html[script_start:script_start+300]))
