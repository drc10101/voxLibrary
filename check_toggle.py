content = open('index.html', 'rb').read()
idx = content.find(b"async function emailAudioFile()")
print('emailAudioFile at:', idx)
print(repr(content[idx-30:idx+30]))
