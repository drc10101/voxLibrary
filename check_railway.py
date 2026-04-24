import urllib.request, subprocess

# Check Railway's current response
resp = urllib.request.urlopen('https://web-production-5f469.up.railway.app/', timeout=10)
railway = resp.read().decode('utf-8-sig')
print('Railway live:', len(railway), 'bytes')

# Find renderVoices in railway's version
rv = railway.find('function renderVoices')
print('\nRailway renderVoices:')
print(repr(railway[rv:rv+400]))

# Check for debug logs
print('\nHas debug log:', 'renderVoices: voice-grid not found' in railway)
print('Has saveBringVoice nav:', 'Navigate to generator' in railway)
print('Has createPrivateVoice:', 'isCreateYourOwn' in railway)
print('Has "This may take a minute":', 'This may take a minute' in railway)

# Find voice-grid in railway HTML  
vg = railway.find('id="voice-grid"')
print('\nRailway voice-grid context:')
print(repr(railway[vg-50:vg+150]))

# Check which commit Railway has
# Look for a commit marker in the JS
for marker in ['247ec28', '81fe8b4', '816f5fc', 'bc5d352']:
    if marker in railway:
        print(f'\nRailway has commit: {marker}')

# Check what the voices array looks like in Railway
va = railway.find('const voices = [')
print('\nRailway voices array start:')
print(repr(railway[va:va+200]))
