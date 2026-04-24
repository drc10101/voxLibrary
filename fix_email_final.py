data = open('index.html', 'rb').read()

# 1. Fix email section HTML - add a choice-div for community vs private
old_email_section = (
    b'  <div id="email-section" style="display:none; margin-top: 20px; padding: 16px; background: rgba(99,102,241,0.1); border-radius: 12px; border: 1px solid rgba(99,102,241,0.3);">\r\n'
    b'    <p style="color: var(--text); font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Email your audio instead</p>\r\n'
    b'    <div style="margin-bottom: 10px;">\r\n'
    b'      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">\r\n'
    b'        <input type="checkbox" id="email-use-private-checkbox" onchange="toggleEmailPrivate()">\r\n'
    b'        <span id="email-private-label">I want to keep this voice private ($9.99)</span>\r\n'
    b'      </label>\r\n'
    b'    </div>\r\n'
    b'    <div id="email-form-area" style="display:none;">\r\n'
    b'      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">\r\n'
    b'        <input type="email" id="email-audio-input" placeholder="your@email.com" style="flex: 1; min-width: 160px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); font-size: 14px;">\r\n'
    b'        <button class="btn btn-primary" id="email-audio-btn" onclick="emailAudioFile()">Send Email</button>\r\n'
    b'      </div>\r\n'
    b'      <div id="email-audio-status" style="font-size: 13px; color: var(--text-muted);"></div>\r\n'
    b'    </div>\r\n'
    b'  </div>'
)

new_email_section = (
    b'  <div id="email-section" style="display:none; margin-top: 20px; padding: 16px; background: rgba(99,102,241,0.1); border-radius: 12px; border: 1px solid rgba(99,102,241,0.3);">\r\n'
    b'    <p style="color: var(--text); font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Email your audio instead</p>\r\n'
    b'    <div id="email-choice-area">\r\n'
    b'      <div style="margin-bottom: 8px;">\r\n'
    b'        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">\r\n'
    b'          <input type="checkbox" id="email-use-private-checkbox" onchange="toggleEmailPrivate()">\r\n'
    b'          <span id="email-private-label">Make this voice private ($9.99) - sent to my email</span>\r\n'
    b'        </label>\r\n'
    b'      </div>\r\n'
    b'      <div style="font-size: 12px; color: var(--text-muted); padding-left: 24px;">Unchecked = submit to community library for free</div>\r\n'
    b'    </div>\r\n'
    b'    <div id="email-form-area" style="display:none; margin-top: 12px;">\r\n'
    b'      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">\r\n'
    b'        <input type="email" id="email-audio-input" placeholder="your@email.com" style="flex: 1; min-width: 160px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); font-size: 14px;">\r\n'
    b'        <button class="btn btn-primary" id="email-audio-btn" onclick="emailAudioFile()">Send Email</button>\r\n'
    b'      </div>\r\n'
    b'      <div id="email-audio-status" style="font-size: 13px; color: var(--text-muted);"></div>\r\n'
    b'    </div>\r\n'
    b'  </div>'
)

if old_email_section in data:
    data = data.replace(old_email_section, new_email_section)
    print('Email section HTML updated!')
else:
    print('Email section HTML not found')

# 2. Fix the JS handler - show email section with form visible by default (community path)
old_handler = (
    b"    if (isCommunityVoice) {\r\n"
    b'      emailSection.style.display = \'block\';\r\n'
    b"      emailFormArea.style.display = \'none\';\r\n"
    b'      privateCheckbox.checked = false;\r\n'
    b'      // Pre-fill email if logged in\r\n'
    b'      if (userState.email) {\r\n'
    b"        document.getElementById('email-audio-input').value = userState.email;\r\n"
    b'      } else {\r\n'
    b"        document.getElementById('email-audio-input').value = '';\r\n"
    b'      }\r\n'
    b'    } else {'
)

new_handler = (
    b"    if (isCommunityVoice) {\r\n"
    b'      emailSection.style.display = \'block\';\r\n'
    b"      emailFormArea.style.display = \'flex\';\r\n"
    b'      privateCheckbox.checked = false;\r\n'
    b"      document.getElementById('email-choice-area').style.display = \'block\';\r\n"
    b'      // Pre-fill email if logged in\r\n'
    b'      if (userState.email) {\r\n'
    b"        document.getElementById('email-audio-input').value = userState.email;\r\n"
    b'      } else {\r\n'
    b"        document.getElementById('email-audio-input').value = '';\r\n"
    b'      }\r\n'
    b'    } else {'
)

if old_handler in data:
    data = data.replace(old_handler, new_handler)
    print('JS handler updated!')
else:
    print('JS handler pattern not found')

open('index.html', 'wb').write(data)
print('Done!')
