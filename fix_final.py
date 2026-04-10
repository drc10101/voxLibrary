content = open('index.html', 'rb').read()

# The remaining garbled sequence is likely double/triple encoded "
# \xc3\xa2 = â (Windows-1252 for â)
# \xe2\x82\xac = ¢ (UTF-8 for ¢)
# But together it's garbage - likely from " going through wrong encodings
# Let's try to fix by replacing the whole garbled sequence

# Pattern: \xc3\xa2\xe2\x82\xac followed by \xe2\x80\x9d (which is ")
old_seq = b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d'
new_seq = b'"'
if old_seq in content:
    content = content.replace(old_seq, new_seq)
    print(f'Fixed {old_seq} -> "')

open('index.html', 'wb').write(content)
