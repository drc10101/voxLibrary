const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// New voice list from ElevenLabs
const newVoices = `const voices = [
  { id: 1, key: 'cjVigY5qzO86Huf0OWal', name: "Eric", desc: "Smooth & Trustworthy", category: "professional", icon: "🎩" },
  { id: 2, key: 'EXAVITQu4vr4xnSDxMaL', name: "Sarah", desc: "Mature & Confident", category: "professional", icon: "👩💼" },
  { id: 3, key: 'IKne3meq5aSn9XLyUdCD', name: "Charlie", desc: "Deep & Energetic", category: "professional", icon: "🎖️" },
  { id: 4, key: 'JBFqnCBsd6RMkjVDRZzb', name: "George", desc: "Warm Storyteller", category: "story", icon: "📖" },
  { id: 5, key: 'FGY2WhTYpPnrIDTdsKH5', name: "Laura", desc: "Enthusiastic & Quirky", category: "social", icon: "😄" },
  { id: 6, key: 'TX3LPaxmHKxFdv7VOQHJ', name: "Liam", desc: "Social Media Creator", category: "social", icon: "📱" },
  { id: 7, key: 'Xb7hH8MSUJpSbSDYk0k2', name: "Alice", desc: "Clear Educator", category: "professional", icon: "👩‍🏫" },
  { id: 8, key: 'XrExE9yKIg1WjnnlVkGX', name: "Matilda", desc: "Knowledgeable Pro", category: "professional", icon: "🎓" },
  { id: 9, key: 'bIHbv24MWmeRgasZH58o', name: "Will", desc: "Relaxed Optimist", category: "everyman", icon: "😎" },
  { id: 10, key: 'cgSgspJ2msm6clMCkdW9', name: "Jessica", desc: "Playful & Warm", category: "everyman", icon: "😊" },
  { id: 11, key: 'iP95p4xoKVk53GoZ742B', name: "Chris", desc: "Down-to-Earth", category: "everyman", icon: "🙂" },
  { id: 12, key: 'nPczCjzI2devNBz1zQrb', name: "Brian", desc: "Deep & Comforting", category: "everyman", icon: "�深沉" },
  { id: 13, key: 'onwK4e9ZLuTAKqWW03F9', name: "Daniel", desc: "Steady Broadcaster", category: "professional", icon: "🎙️" },
  { id: 14, key: 'SOYHLrjzK2X1ezoPC6cr', name: "Harry", desc: "Fierce Warrior", category: "character", icon: "⚔️" },
  { id: 15, key: 'pNInz6obpgDQGcFmaJgB', name: "Adam", desc: "Dominant & Firm", category: "character", icon: "🦹" },
  { id: 16, key: 'CwhRBWXzGAHq8TQ4Fs17', name: "Roger", desc: "Laid-Back Casual", category: "everyman", icon: "🤙" },
  { id: 17, key: 'N2lVS1w4EtoT3dr4eOWO', name: "Callum", desc: "Husky Trickster", category: "character", icon: "🧐" },
  { id: 18, key: 'SAz9YHcvj6GT2YYXdXww', name: "River", desc: "Relaxed Neutral", category: "everyman", icon: "🌊" },
  { id: 19, key: 'pFZP5JQG7iQjIQuC4Bku', name: "Lily", desc: "Velvety Actress", category: "story", icon: "🎭" },
  { id: 20, key: 'hpp4J3VqNfWAUOO0d1Us', name: "Bella", desc: "Professional Bright", category: "professional", icon: "✨" }
];`;

d = d.replace(/const voices = \[[\s\S]*?\];/, newVoices);
fs.writeFileSync('index.html', d);
console.log('Done');
