import fs from 'fs';

const files = [
  '/Users/liuzifan/.gemini/tmp/clowder-ai/chats/session-2026-04-06T05-32-4bdabc11.json',
  '/Users/liuzifan/.gemini/tmp/clowder-ai/chats/session-2026-04-06T09-06-4ec8ab2d.json',
  '/Users/liuzifan/.gemini/tmp/clowder-ai/chats/session-2026-04-06T08-40-b39f7cb0.json',
  '/Users/liuzifan/.gemini/tmp/clowder-ai/chats/session-2026-04-06T07-08-270e1fbc.json',
  '/Users/liuzifan/.gemini/tmp/clowder-ai/chats/session-2026-04-06T06-09-709591d4.json'
];

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Checking file ${file}:`);
    for (let i = data.messages?.length - 1; i >= 0; i--) {
      const msg = data.messages[i];
      let b64Images = [];

      // Check contentBlocks
      if (Array.isArray(msg.contentBlocks)) {
        for (const block of msg.contentBlocks) {
          if (block.type === 'image' && block.base64) b64Images.push(block.base64);
        }
      }
      
      // Check content.parts (Gemini format)
      if (msg.content && Array.isArray(msg.content.parts)) {
        for (const part of msg.content.parts) {
          if (part.inlineData && part.inlineData.data) b64Images.push(part.inlineData.data);
        }
      }

      // Check parts directly
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (part.inlineData && part.inlineData.data) b64Images.push(part.inlineData.data);
        }
      }

      if (b64Images.length > 0) {
        console.log(`  - Message ${i} [${msg.type || msg.role}] has ${b64Images.length} images.`);
      }
    }
  } catch(e) {
    // console.error(`Error reading ${file}`);
  }
}
