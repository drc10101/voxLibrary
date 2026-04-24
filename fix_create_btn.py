data = open('index.html', 'rb').read()
idx = data.find(b'<!-- Create Voice Modal (hidden until button clicked) -->')
print('Found at:', idx)

# The closing sequence before the comment
# community-voices-section closes with </div> then there are blank lines then the comment
# html[idx-20:idx] = b'/div>\r\n\r\n\r\n\r\n\r\n<!-- '
# So html[idx-20:idx] ends with '<!-- '

old_pattern = b'/div>\r\n\r\n\r\n\r\n\r\n<!-- Create Voice Modal (hidden until button clicked) -->\r\n\r\n<div class="section" id="create-voice-section"'

new_pattern = (
    b'/div>\r\n\r\n\r\n\r\n\r\n'
    b'<!-- Create Your Own Voice -->\r\n'
    b'<div style="text-align:center;padding:20px 16px;margin-top:12px;">\r\n'
    b'  <a href="#" onclick="openCreateVoiceModal();return false;" style="color:#818cf8;font-size:18px;font-weight:600;text-decoration:none;display:inline-block;padding:12px 24px;border:2px solid rgba(99,102,241,0.4);border-radius:12px;background:rgba(99,102,241,0.1);transition:all 0.2s;">\r\n'
    b'    + Create your own voice clone\r\n'
    b'  </a>\r\n'
    b'</div>\r\n\r\n'
    b'<!-- Create Voice Modal (hidden until button clicked) -->\r\n\r\n'
    b'<div class="section" id="create-voice-section"'
)

if old_pattern in data:
    data = data.replace(old_pattern, new_pattern)
    open('index.html', 'wb').write(data)
    print('Fixed!')
else:
    print('Pattern not found')
    # Try shorter
    short = b'<!-- Create Voice Modal (hidden until button clicked) -->'
    pos = data.find(short)
    print('Comment at:', pos)
    print(repr(data[pos-50:pos+100]))
