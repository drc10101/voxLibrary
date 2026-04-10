import subprocess
result = subprocess.run(['git', 'show', 'abda05d:index.html'], capture_output=True, text=False, cwd='.')
html = result.stdout.decode('utf-8-sig')

# Find key sections
browse = html.find('browse-section')
comm = html.find('community-voices-section')
create = html.find('Create Your Own Voice')
voice_grid = html.find('id="voice-grid"')
browse_close = html.find('</div>', html.find('id="browse-section"'))

print('browse-section:', browse)
print('community-voices-section:', comm)
print('Create Your Own Voice:', create)
print('voice-grid:', voice_grid)
print('browse-section closes at:', browse_close)

# Show context around community-voices-section
print('\n--- Around community-voices-section ---')
print(repr(html[comm-80:comm+300]))

# Show what's between browse close and community
print('\n--- Between browse close and community ---')
print(repr(html[browse_close-50:browse_close+50]))

# Show the old community and create button
print('\n--- Old community section ---')
# Find the whole community-voices-section div
comm_start = html.find('<div class="section" id="community-voices-section"')
comm_end = html.find('</div>', comm_start) + 6
print(f'Community section: {comm_start} to {comm_end}')
print(repr(html[comm_start:comm_end]))
