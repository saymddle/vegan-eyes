const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');

const config = {
  mistralKey: process.env.MISTRAL_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY
};

const client = new Mistral({ apiKey: config.mistralKey });

// Clean the AI's response in case it wraps it in ```json blocks
function cleanJSONResponse(rawString) {
  return rawString.replace(/```json|```/g, "").trim();
}

async function checkVeganStatus(ingredients) {
  console.log("🔍 Consulting the database...");
  
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/check_vegan_status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabaseKey,
      'Authorization': `Bearer ${config.supabaseKey}`
    },
    body: JSON.stringify({ search_terms: ingredients })
  });

  const results = await response.json();
  
  console.log("\n--- VEGAN EYES REPORT ---");
  if (!results || results.length === 0) {
    console.log("No matches found in the database.");
  } else {
    results.forEach(item => {
      const icon = item.status === 'vegan' ? '✅' : (item.status === 'non_vegan' ? '❌' : '⚠️');
      console.log(`${icon} ${item.found_term.padEnd(20)} -> ${item.ingredient_name.toUpperCase()} (${item.status})`);
      if (item.note) console.log(`   💡 Note: ${item.note}`);
    });
  }
  console.log("------------------------\n");
}

async function scanAndCheck(imagePath) {
  try {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });

    console.log("👁️  Mistral is looking at the label...");
    const chatResponse = await client.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'List every ingredient on this label. Output ONLY a valid JSON object with the key "ingredients".' },
            { type: 'image_url', imageUrl: `data:image/jpeg;base64,${base64Image}` }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    });

    const rawContent = chatResponse.choices[0].message.content;
    const cleanedContent = cleanJSONResponse(rawContent);
    const ocrData = JSON.parse(cleanedContent);

    await checkVeganStatus(ocrData.ingredients);

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("Usage: node ocr_scan.js <image_path>");
} else {
  scanAndCheck(imagePath);
}
