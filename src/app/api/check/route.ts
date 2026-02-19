import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

export async function POST(req: Request) {
  try {
    const { ingredients } = await req.json();
    const cleanRawText = (ingredients as string).trim();
    
    // 1. Check Product Memory (Cache) first
    // Note: We now select the new intelligence columns
    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('ingredient_text', cleanRawText)
      .single();

    if (existingProduct) {
      return NextResponse.json({ 
        ...existingProduct,
        status: existingProduct.vegan_status, 
        flagged: existingProduct.flagged_ingredients, 
        cached: true 
      });
    }

    // 2. Clean and Parse Ingredients
    const fullList = cleanRawText
      .toLowerCase()
      .replace(/[():.;\[\]*]/g, ',')
      .split(',')
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 2);

    // 3. Fetch Deep Intelligence from Supabase
    // We fetch the "Why", "How", and "Nourishment" data
    const { data: dbIngredients } = await supabase
      .from('ingredients')
      .select('name, vegan_status, function_logic, nourishment_fact, vegan_substitute, sub_reasoning, is_composite, components')
      .in('name', fullList);

    const knownNames = dbIngredients?.map(i => i.name) || [];
    const unknownIngredients = fullList.filter(i => !knownNames.includes(i));

    let finalFlaggedItems = dbIngredients?.filter((i: any) => i.vegan_status !== 'vegan') || [];
    let status = finalFlaggedItems.some(i => i.vegan_status === 'non_vegan') ? 'non_vegan' : 'vegan';

    // 4. AI Fallback for Unknowns
    if (unknownIngredients.length > 0) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a vegan food scientist. Analyze ingredients and return ONLY JSON." },
          { role: "user", content: `Analyze: ${unknownIngredients.join(', ')}. Return: {"is_vegan": boolean, "maybe": boolean, "flagged": [{"name": "item", "reason": "why", "function": "what it does", "nourishment": "health fact"}], "explanation": "short summary"}` }
        ],
        response_format: { type: "json_object" }
      });

      const aiJson = JSON.parse(response.choices[0].message.content || '{}');

      if (!aiJson.is_vegan || aiJson.maybe) {
        status = aiJson.maybe ? 'maybe_vegan' : 'non_vegan';
        
        // Map AI response to match our Deep Intelligence DB structure
        const aiFlaggedFormatted = aiJson.flagged.map((f: any) => ({
          name: f.name,
          vegan_status: aiJson.maybe ? 'maybe_vegan' : 'non_vegan',
          function_logic: f.function || 'Unknown',
          nourishment_fact: f.nourishment || 'No specific nourishment data available.',
          sub_reasoning: f.reason
        }));
        
        finalFlaggedItems = [...finalFlaggedItems, ...aiFlaggedFormatted];
      }
    }

    const flaggedNames = [...new Set(finalFlaggedItems.map(f => f.name))];
    const explanation = flaggedNames.length > 0 
      ? `Analysis complete. Found ${flaggedNames.length} items to review.`
      : "All ingredients appear to be vegan and nourishing.";

    // 5. Save to Memory for future users
    // We store the rich flagged data so the cache is just as "smart" as a live scan
    await supabase.from('products').insert({
      ingredient_text: cleanRawText,
      vegan_status: status,
      flagged_ingredients: finalFlaggedItems, // Saving the full objects
      explanation: explanation
    });

    return NextResponse.json({ 
      status, 
      flagged: finalFlaggedItems, 
      explanation, 
      cached: false 
    });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
