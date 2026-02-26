const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function deepScan(imagePath) {
  const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
  
  console.log("🔍 PERMITTING DEEP SCAN: Looking for cross-contamination...");
  
  const response = await client.chat.complete({
    model: 'pixtral-12b-2409',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this label for "may contain" warnings, "processed in a facility" statements, or hidden animal derivatives. Return a JSON object with "risk_level" (Low/Medium/High) and "warnings" (array).' },
        { type: 'image_url', imageUrl: `data:image/jpeg;base64,${base64Image}` }
      ]
    }],
    response_format: { type: 'json_object' }
  });

  console.log(response.choices[0].message.content);
}

deepScan(process.argv[2]);
