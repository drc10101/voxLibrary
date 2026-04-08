with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\\u{1F3A4} Start Recording', 'Start Recording')
content = content.replace('\\xe2\\x80\\x94 Clone My Voice', 'Clone My Voice')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
