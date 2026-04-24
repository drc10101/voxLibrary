"""
Fix the download screen email section: replace old email-only section with new one that has checkbox.
"""
html = open('index.html', 'rb').read()

# The old email section in download screen - find it by looking for the old pattern with specific styling
# It appears AFTER download-info div and BEFORE download-btns
old_email = (
    b'  <div style="margin-top: 20px; padding: 16px; background: rgba(99,102,241,0.1); border-radius: 12px; border: 1px solid rgba(99,102,241,0.3);">\r\n'
    b'    <p style="color: var(--text); font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Email your audio instead</p>\r\n'
    b'    <div style="display: flex; gap: 8px; flex-wrap: wrap;">\r\n'
    b'      <input type="email" id="email-audio-input" placeholder="your@email.com" style="flex: 1; min-width: 160px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); font-size: 14px;">\r\n'
    b'      <button class="btn btn-primary" id="email-audio-btn" onclick="emailAudioFile()">Send Email</button>\r\n'
    b'    </div>\r\n'
    b'    <div id="email-audio-status" style="font-size: 13px; margin-top: 8px; color: var(--text-muted);"></div>\r\n'
    b'  </div>\r\n'
)

new_email = (
    b'  <!-- Email section - only shown for community voices -->\r\n'
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
    b'  </div>\r\n'
)

if old_email in html:
    html = html.replace(old_email, new_email)
    print('Fixed email section!')
else:
    print('Pattern not found - checking actual bytes...')
    # Find the email section in download screen
    idx = html.find(b'Email your audio instead')
    print('Email section at:', idx)
    if idx >= 0:
        print(repr(html[idx-50:idx+500]))

open('index.html', 'wb').write(html)
print('Done')
