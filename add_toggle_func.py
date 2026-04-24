content = open('index.html', 'rb').read()

func = (
    b"\n"
    b"function toggleEmailPrivate() {\n"
    b"  const checkbox = document.getElementById('email-use-private-checkbox');\n"
    b"  const emailForm = document.getElementById('email-form-area');\n"
    b"  const label = document.getElementById('email-private-label');\n"
    b"  if (checkbox.checked) {\n"
    b"    // Send to Stripe for $9.99 private voice\n"
    b"    const email = userState.email || document.getElementById('email-audio-input').value;\n"
    b"    if (!email) {\n"
    b"      checkbox.checked = false;\n"
    b"      alert('Please enter your email address first.');\n"
    b"      return;\n"
    b"    }\n"
    b"    // Create Stripe checkout for private voice\n"
    b"    fetch('/api/create-private-voice', {\n"
    b"      method: 'POST',\n"
    b"      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userState.token },\n"
    b"      body: JSON.stringify({ email: email })\n"
    b"    }).then(r => r.json()).then(data => {\n"
    b"      if (data.url) {\n"
    b"        window.location.href = data.url;\n"
    b"      } else {\n"
    b"        checkbox.checked = false;\n"
    b"        alert('Could not create checkout. Please try again.');\n"
    b"      }\n"
    b"    }).catch(() => {\n"
    b"      checkbox.checked = false;\n"
    b"      alert('Could not create checkout. Please try again.');\n"
    b"    });\n"
    b"  } else {\n"
    b"    emailForm.style.display = 'none';\n"
    b"  }\n"
    b"}\n"
)

# Insert before emailAudioFile
target = b"\n\n\nasync function emailAudioFile() {"
idx = content.find(target)
if idx < 0:
    target = b"\n\nasync function emailAudioFile() {"
    idx = content.find(target)

print('Insert point:', idx)
new_content = content[:idx] + func + content[idx:]
open('index.html', 'wb').write(new_content)
print('Added toggleEmailPrivate!')
