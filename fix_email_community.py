data = open('index.html', 'rb').read()

# Fix: email form shows by default for community voices (not behind checkbox)
old = (
    b'    if (isCommunityVoice) {\r\n'
    b'      emailSection.style.display = \'block\';\r\n'
    b'      emailFormArea.style.display = \'none\';\r\n'
    b'      privateCheckbox.checked = false;\r\n'
    b'      // Pre-fill email if logged in\r\n'
    b'      if (userState.email) {\r\n'
    b"        document.getElementById('email-audio-input').value = userState.email;\r\n"
    b'      } else {\r\n'
    b"        document.getElementById('email-audio-input').value = '';\r\n"
    b'      }\r\n'
    b'    } else {'
)

new = (
    b'    if (isCommunityVoice) {\r\n'
    b'      emailSection.style.display = \'block\';\r\n'
    b'      emailFormArea.style.display = \'flex\';\r\n'
    b'      privateCheckbox.checked = false;\r\n'
    b'      // Pre-fill email if logged in\r\n'
    b'      if (userState.email) {\r\n'
    b"        document.getElementById('email-audio-input').value = userState.email;\r\n"
    b'      } else {\r\n'
    b"        document.getElementById('email-audio-input').value = '';\r\n"
    b'      }\r\n'
    b'    } else {'
)

if old in data:
    data = data.replace(old, new)
    open('index.html', 'wb').write(data)
    print('Fixed!')
else:
    print('Pattern not found')
