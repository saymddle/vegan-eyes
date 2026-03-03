const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');

const config = {
  mistralKey: process.env.MISTRAL_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY
};

const client = new Mistral({ apiKey: config.mistralKey });

async function checkVeganStatus(ingredients) {
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
  
  const vegan = [];
  const nonVegan = [];
  const unsure = [];

  results.forEach(item => {
    if (item.status === 'vegan') vegan.push(item);
    else if (item.status === 'non_vegan') nonVegan.push(item);
    else unsure.push(item);
  });

  console.log("\n===========================================");
  console.log("             VEGAN EYES REPORT             ");
  console.log("===========================================\n");

  if (nonVegan.length > 0) {
    console.log("❌ NOT VEGAN");
    nonVegan.forEach(item => {
      console.log(` • ${item.found_term.toUpperCase()}`);
      console.log(`   └─ Alternative: ${item.substitute || "No common substitute found"}`);
    });
    console.log("");
  }

  if (unsure.length > 0) {
    console.log("⚠️  UNSURE (GRAY AREA)");
    unsure.forEach(item => {
      console.log(` • ${item.found_term.toUpperCase()}`);
      console.log(`   └─ Why: ${item.note || "Source varies by manufacturer"}`);
    });
    console.log("");
  }

  if (vegan.length > 0) {
    console.log("✅ VEGAN INGREDIENTS");
    console.log(` ${vegan.map(v => v.found_term).join(", ")}`);
    console.log("");
  }
  
  console.log("===========================================\n");
}

async function scanAndCheck(imagePath) {
  try {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    const chatResponse = await client.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all ingredients from this label. Output ONLY a JSON object with a key "ingredients" containing an array of strings.' },
          { type: 'image_url', imageUrl: `data:image/jpeg;base64,${base64Image}` }
        ]
      }],
      response_format: { type: 'json_object' }
    });

    const ocrData = JSON.parse(chatResponse.choices[0].message.content.replace(/```json|```/g, "").trim());
    await checkVeganStatus(ocrData.ingredients);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

scanAndCheck(process.argv[2]);
