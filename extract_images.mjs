import fs from 'fs';

const sessionFile = '/Users/liuzifan/.gemini/tmp/clowder-ai/chats/session-2026-04-06T09-06-4ec8ab2d.json';
const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

let imageCount = 0;
for (const msg of data.messages || []) {
  if (Array.isArray(msg.contentBlocks)) {
    for (const block of msg.contentBlocks) {
      if (block.type === 'image' && block.base64) {
        imageCount++;
        console.log(`Found image ${imageCount}: ${block.mimeType} length: ${block.base64.length}`);
      }
    }
  } else if (msg.type === 'user' && msg.content && typeof msg.content === 'object' && msg.content.parts) {
     for (const part of msg.content.parts) {
       if (part.inlineData) {
          imageCount++;
          console.log(`Found inline image ${imageCount}: ${part.inlineData.mimeType} length: ${part.inlineData.data.length}`);
       }
     }
  } else if (Array.isArray(msg.parts)) {
     for (const part of msg.parts) {
       if (part.inlineData) {
          imageCount++;
          console.log(`Found part inline image ${imageCount}: ${part.inlineData.mimeType} length: ${part.inlineData.data.length}`);
       }
     }
  }
}
if (imageCount === 0) console.log("No base64 images found. Let's inspect the last message structure:", JSON.stringify(data.messages[data.messages.length - 1]).substring(0, 500));
