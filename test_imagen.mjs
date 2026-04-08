import fs from 'fs';

async function testGenerate() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: "A cute cartoon cat avatar" }],
      parameters: { sampleCount: 1 }
    })
  });
  
  if (!response.ok) {
    console.error("Failed:", response.status, await response.text());
    return;
  }
  
  const data = await response.json();
  console.log("Success! Data keys:", Object.keys(data));
  if (data.predictions && data.predictions.length > 0) {
    console.log("Prediction keys:", Object.keys(data.predictions[0]));
  }
}

testGenerate();
