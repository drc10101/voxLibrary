const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');
// Add debug before generateWithElevenLabs call
d = d.replace(
  'const audioBlob = await generateWithElevenLabs(',
  'console.log("Generating with voice:", selectedVoice?.key, "text length:", text.length); const audioBlob = await generateWithElevenLabs('
);
fs.writeFileSync('index.html', d);
console.log('Done');
