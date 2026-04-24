content = open('index.html', 'r', encoding='utf-8-sig').read()

comm_start = content.find('<!-- Community Voices -->')
browse_close_idx = content.rfind('</div>', 0, comm_start)
print('browse-section closes at:', browse_close_idx)

comm_section_start = content.find('<div class="section" id="community-voices-section"')
comm_section_end = content.find('</div>', comm_section_start) + 6

print('Community section: from', comm_section_start, 'to', comm_section_end)

new_comm_html = '''
  <!-- Community Voices - inside browse, expands as voices are added -->
  <div id="community-voices-section" style="margin-top: 24px;">
    <div class="section-title" style="font-size:18px;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700;">Community Voices</div>
    <div style="text-align:center;padding:0 0 12px 0;">
      <a href="#" onclick="openBringVoiceModal();return false;" style="color:#818cf8;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;padding:8px 16px;border:1px solid rgba(99,102,241,0.4);border-radius:8px;background:rgba(99,102,241,0.1);">Bring your own voice file</a>
    </div>
    <div class="voice-grid" id="community-voices-grid"></div>
  </div>
'''

new_content = content[:browse_close_idx] + new_comm_html + content[comm_section_end:]
open('index.html', 'w', encoding='utf-8-sig').write(new_content)
print('Fixed! New length:', len(new_content))
