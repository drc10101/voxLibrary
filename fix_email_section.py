data = open('index.html', 'rb').read()

old = (
    b".add('active');\r\n"
    b"\r\n"
    b"\r\n"
    b"\r\n"
    b"    // Pre-fill email if logged in\r\n"
    b"\r\n"
    b"    if (userState.email) {\r\n"
    b"\r\n"
    b"      document.getElementById('email-audio-input').value = userState.email;\r\n"
    b"\r\n"
    b"    }\r\n"
    b"\r\n"
    b"\r\n"
    b"\r\n"
    b"    document.getElementById('char-count').textContent = text.length;"
)

new_js = (
    b".add('active');\r\n"
    b"\r\n"
    b"\r\n"
    b"\r\n"
    b"    // Show/hide email section based on voice type (community voices only)\r\n"
    b"    const isCommunityVoice = selectedVoice && (\r\n"
    b"      selectedVoice.voice_id ||\r\n"
    b"      (selectedVoice.key && !voices.find(v => v.id === selectedVoice.id))\r\n"
    b"    );\r\n"
    b"    const emailSection = document.getElementById('email-section');\r\n"
    b"    const emailFormArea = document.getElementById('email-form-area');\r\n"
    b"    const privateCheckbox = document.getElementById('email-use-private-checkbox');\r\n"
    b"    if (isCommunityVoice) {\r\n"
    b"      emailSection.style.display = 'block';\r\n"
    b"      emailFormArea.style.display = 'none';\r\n"
    b"      privateCheckbox.checked = false;\r\n"
    b"      // Pre-fill email if logged in\r\n"
    b"      if (userState.email) {\r\n"
    b"        document.getElementById('email-audio-input').value = userState.email;\r\n"
    b"      } else {\r\n"
    b"        document.getElementById('email-audio-input').value = '';\r\n"
    b"      }\r\n"
    b"    } else {\r\n"
    b"      emailSection.style.display = 'none';\r\n"
    b"    }\r\n"
    b"\r\n"
    b"\r\n"
    b"\r\n"
    b"\r\n"
    b"    document.getElementById('char-count').textContent = text.length;"
)

if old in data:
    data = data.replace(old, new_js)
    open('index.html', 'wb').write(data)
    print('Fixed!')
else:
    print('Not found')
