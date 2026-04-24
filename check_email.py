data = open('index.html', 'rb').read()
idx = data.find(b'Pre-fill email')
# Show exact bytes
chunk = data[idx-30:idx+300]
# Count exact \r\n sequences
before = chunk[:chunk.find(b'// Pre-fill')]
print('Before:', repr(before))
print('Total len:', len(chunk))
# Print each byte pair
for i in range(0, min(len(chunk), 80)):
    print(i, chunk[i], end=' ')
    if i % 10 == 9:
        print()
