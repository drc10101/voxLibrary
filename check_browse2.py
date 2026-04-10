import urllib.request
resp = urllib.request.urlopen('https://web-production-5f469.up.railway.app/', timeout=10)
html = resp.read().decode('utf-8-sig', errors='replace')

# Check the HTML body for browse-section
bs = html.find('id="browse-section"')
print('browse-section context:')
print(repr(html[bs:bs+600]))
print()

# Find renderVoices
rv = html.find('function renderVoices')
rv_end = html.find('function filterVoices', rv)
print('renderVoices function:')
print(html[rv:rv_end])
