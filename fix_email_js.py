data = open('index.html', 'rb').read()

# Find start and end of the pre-fill block
start = data.find(b'// Pre-fill email if logged in')
end = data.find(b"document.getElementById('char-count').textContent", start)

print('Start:', start, 'End:', end)
print('Found block:')
print(repr(data[start-20:end]))

# Build new block
new_block = (
    b'    // Show/hide email section based on voice type (community voices only)\r\n'
    b'    const isCommunityVoice = selectedVoice && (\r\n'
    b"      selectedVoice.voice_id ||\r\n"
    b"      (selectedVoice.key && !voices.find(v => v.id === selectedVoice.id))\r\n"
    b'    );\r\n'
    b"    const emailSection = document.getElementById('email-section');\r\n"
    b"    const emailFormArea = document.getElementById('email-form-area');\r\n"
    b"    const privateCheckbox = document.getElementById('email-use-private-checkbox');\r\n"
    b'    if (isCommunityVoice) {\r\n'
    b"      emailSection.style.display = 'block';\r\n"
    b"      emailFormArea.style.display = 'none';\r\n"
    b'      privateCheckbox.checked = false;\r\n'
    b'      // Pre-fill email if logged in\r\n'
    b'      if (userState.email) {\r\n'
    b"        document.getElementById('email-audio-input').value = userState.email;\r\n"
    b'      } else {\r\n'
    b"        document.getElementById('email-audio-input').value = '';\r\n"
    b'      }\r\n'
    b'    } else {\r\n'
    b"      emailSection.style.display = 'none';\r\n"
    b'    }\r\n'
    b'\r\n'
    b'\r\n'
    b'\r\n'
)

# Replace just the pre-fill block (not the char-count line)
new_data = data[:start] + new_block + data[end:]
open('index.html', 'wb').write(new_data)
print('Fixed! New length:', len(new_data))
