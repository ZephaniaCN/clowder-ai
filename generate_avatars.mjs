import fs from 'fs';
import path from 'path';

const outDir = '/Users/liuzifan/Projects/clowder-ai/packages/web/public/avatars/';

const avatars = [
  {
    name: 'ragdoll.png',
    desc: 'ragdoll cat with blue eyes and a fluffy collar, sitting inside a glass jar'
  },
  {
    name: 'codex.png',
    desc: 'maine coon cat, sleeping on a colorful RGB mechanical keyboard'
  },
  {
    name: 'gemini.png',
    desc: 'siamese cat with blue eyes, waving its paw from inside a cardboard box'
  },
  {
    name: 'dare.png',
    desc: 'grey and brown tabby Chinese Dragon Li cat (Li Hua), sitting in a cardboard box'
  },
  {
    name: 'antigravity.png',
    desc: 'bengal cat with beautiful leopard spots, sitting on an open modern laptop'
  }
];

async function generateImage(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  
  const fullPrompt = `A professional, highly polished cute 2D flat vector cartoon avatar of a ${prompt}, thick clean outlines, vibrant colors, solid white background, centered perfectly for a circular profile picture, clean UI design style, masterpiece.`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: fullPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1"
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.predictions[0].bytesBase64Encoded;
}

async function main() {
  for (const avatar of avatars) {
    console.log(`Generating ${avatar.name}...`);
    try {
      const base64Str = await generateImage(avatar.desc);
      const outPath = path.join(outDir, avatar.name);
      fs.writeFileSync(outPath, Buffer.from(base64Str, 'base64'));
      console.log(`Saved ${outPath}`);
      // Wait a bit to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`Failed to generate ${avatar.name}:`, e.message);
    }
  }
}

main();
