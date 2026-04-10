const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
console.log('Total length:', html.length);
console.log('Has voice-grid:', html.includes('id="voice-grid"'));
console.log('Has const voices:', html.includes('const voices'));
console.log('Has renderVoices:', html.includes('renderVoices()'));
console.log('Has section browse:', html.includes('id="browse-section"'));
console.log('Has supabase init:', html.includes('supabase.createClient'));
// Check order
const vgPos = html.indexOf('id="voice-grid"');
const voicesPos = html.indexOf('const voices');
const renderPos = html.indexOf('renderVoices()');
const browsePos = html.indexOf('id="browse-section"');
console.log('voice-grid at:', vgPos);
console.log('const voices at:', voicesPos);
console.log('renderVoices() at:', renderPos);
console.log('browse-section at:', browsePos);
console.log('Order OK (browse < voices < voice-grid < renderVoices):', 
  browsePos < voicesPos && voicesPos < vgPos && vgPos < renderPos);
