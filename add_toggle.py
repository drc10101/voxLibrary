data = open('index.html', 'rb').read()

# Find async function emailAudioFile()
target = b'async function emailAudioFile()'
idx = data.find(target)
print('async function emailAudioFile at:', idx)

# Insert toggle function BEFORE it
new_fn = (
    b'function toggleEmailPrivate() {\r\n'
    b'  const checkbox = document.getElementById(\'email-use-private-checkbox\');\r\n'
    b'  const emailFormArea = document.getElementById(\'email-form-area\');\r\n'
    b'  if (checkbox.checked) {\r\n'
    b'    // Redirect to Stripe checkout for private voice\r\n'
    b"    const email = document.getElementById('email-audio-input').value;\r\n"
    b'    if (!email || !email.includes(\'@\')) {\r\n'
    b"      alert(\'Please enter your email address first.\');\r\n"
    b'      checkbox.checked = false;\r\n'
    b'      return;\r\n'
    b'    }\r\n'
    b"    window.privateVoiceEmail = email;\r\n"
    b"    window.privateVoiceRedirectUrl = window.location.href;\r\n"
    b"    fetch('/api/create-checkout-session', {\r\n"
    b"      method: 'POST',\r\n"
    b"      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (userState.token || '') },\r\n"
    b"      body: JSON.stringify({\r\n"
    b"        plan: 'private_voice',\r\n"
    b"        email: email,\r\n"
    b"        voice_name: selectedVoice.name,\r\n"
    b"        voice_key: selectedVoice.key,\r\n"
    b"        text: window.generatedAudioText,\r\n"
    b"        redirect_url: window.location.href\r\n"
    b'      })\r\n'
    b"    }).then(r => r.json()).then(d => {\r\n"
    b"      if (d.url) window.location.href = d.url;\r\n"
    b"      else alert('Could not create checkout session.');\r\n"
    b'    }).catch(() => alert(\'Checkout error. Please try again.\'));\r\n'
    b'  } else {\r\n'
    b'    emailFormArea.style.display = \'none\';\r\n'
    b'  }\r\n'
    b'}\r\n'
    b'\r\n'
)

new_data = data[:idx] + new_fn + data[idx:]
open('index.html', 'wb').write(new_data)
print('Fixed! New length:', len(new_data))
