data = open('index.html', 'rb').read()

old_fn = (
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
    b'}'
)

new_fn = (
    b'async function toggleEmailPrivate() {\r\n'
    b'  const checkbox = document.getElementById(\'email-use-private-checkbox\');\r\n'
    b'  const emailFormArea = document.getElementById(\'email-form-area\');\r\n'
    b'  if (checkbox.checked) {\r\n'
    b"    const email = document.getElementById('email-audio-input').value;\r\n"
    b'    if (!email || !email.includes(\'@\')) {\r\n'
    b"      alert('Please enter your email address first.');\r\n"
    b'      checkbox.checked = false;\r\n'
    b'      return;\r\n'
    b'    }\r\n'
    b'    // Fetch generated audio as blob and convert to base64\r\n'
    b'    let audioBase64 = \'\';\r\n'
    b'    try {\r\n'
    b"      const resp = await fetch(window.generatedAudioUrl);\r\n"
    b'      const blob = await resp.blob();\r\n'
    b'      const reader = new FileReader();\r\n'
    b'      audioBase64 = await new Promise((resolve, reject) => {\r\n'
    b'        reader.onload = () => resolve(reader.result.split(\',\')[1]);\r\n'
    b'        reader.onerror = reject;\r\n'
    b'        reader.readAsDataURL(blob);\r\n'
    b'      });\r\n'
    b'    } catch (e) {\r\n'
    b"      alert('Could not read audio file. Please try downloading instead.');\r\n"
    b'      checkbox.checked = false;\r\n'
    b'      return;\r\n'
    b'    }\r\n'
    b"    window.privateVoiceEmail = email;\r\n"
    b"    window.privateVoiceRedirectUrl = window.location.href;\r\n"
    b"    const btn = document.getElementById('email-audio-btn');\r\n"
    b'    if (btn) {\r\n'
    b'      btn.disabled = true;\r\n'
    b"      btn.textContent = 'Redirecting...';\r\n"
    b'    }\r\n'
    b"    fetch('/api/create-private-voice', {\r\n"
    b"      method: 'POST',\r\n"
    b"      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (userState.token || '') },\r\n"
    b"      body: JSON.stringify({\r\n"
    b"        audioBase64,\r\n"
    b"        fileName: window.generatedAudioFilename,\r\n"
    b"        voiceName: selectedVoice.name,\r\n"
    b"        userEmail: email\r\n"
    b'      })\r\n'
    b"    }).then(r => r.json()).then(d => {\r\n"
    b'      if (d.url) {\r\n'
    b"        window.location.href = d.url;\r\n"
    b'      } else {\r\n'
    b"        alert('Could not create checkout session. Please try again.');\r\n"
    b'        if (btn) {\r\n'
    b'          btn.disabled = false;\r\n'
    b"          btn.textContent = 'Send Email';\r\n"
    b'        }\r\n'
    b'      }\r\n'
    b'    }).catch(() => {\r\n'
    b"      alert('Checkout error. Please try again.');\r\n"
    b'      if (btn) {\r\n'
    b'        btn.disabled = false;\r\n'
    b"        btn.textContent = 'Send Email';\r\n"
    b'      }\r\n'
    b'    });\r\n'
    b'  } else {\r\n'
    b'    emailFormArea.style.display = \'none\';\r\n'
    b'  }\r\n'
    b'}'
)

if old_fn in data:
    data = data.replace(old_fn, new_fn)
    open('index.html', 'wb').write(data)
    print('Fixed!')
else:
    print('Function not found')
