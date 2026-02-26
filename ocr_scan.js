const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');

const config = {
  mistralKey: process.env.MISTRAL_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY
};

const client = new Mistral({ apiKey: config.mistralKey });

// --- NEW: HISTORY SAVER ---
function saveToHistory(ingredients, results) {
  const historyPath = 'history.json';
  let history = [];
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath));
  }
  history.push({
    date: new Date().toISOString(),
    scan: ingredients,
    results: results
  });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log("💾 Scan saved to local history.");
}

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
  return await response.json();
}

async function scanAndCheck(imagePath) {
  try {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    const chatResponse = await client.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'List every ingredient. Output ONLY a JSON object with key "ingredients".' },
          { type: 'image_url', imageUrl: `data:image/jpeg;base64,${base64Image}` }
        ]
      }],
      response_format: { type: 'json_object' }
    });

    const ocrData = JSON.parse(chatResponse.choices[0].message.content.replace(/```json|```/g, ""));
    const results = await checkVeganStatus(ocrData.ingredients);
    
    // Display results
    results.forEach(item => {
      console.log(`${item.status === 'vegan' ? '✅' : '❌'} ${item.found_term}`);
    });

    // Save for the History/Favorites feature
    saveToHistory(ocrData.ingredients, results);

  } catch (err) {
    console.error("Error:", err.message);
  }
}

scanAndCheck(process.argv[2]);
