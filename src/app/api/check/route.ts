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
    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('ingredient_text', cleanRawText)
      .single();

    if (existingProduct) {
      return NextResponse.json({ 
        status: existingProduct.vegan_status, 
        flagged: existingProduct.flagged_ingredients, 
        explanation: existingProduct.explanation,
        cached: true 
      });
    }

    // 2. Not in memory? Clean and run analysis
    const fullList = cleanRawText
      .toLowerCase()
      .replace(/[():.;\[\]*]/g, ',')
      .split(',')
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 2);

    const { data: dbIngredients } = await supabase
      .from('ingredients')
      .select('*')
      .in('name', fullList);

    const knownNames = dbIngredients?.map(i => i.name) || [];
    const unknownIngredients = fullList.filter(i => !knownNames.includes(i));

    let finalFlagged = dbIngredients?.filter((i: any) => i.vegan_status !== 'vegan') || [];
    let status = finalFlagged.some(i => i.vegan_status === 'non_vegan') ? 'non_vegan' : 'vegan';

    // 3. AI Fallback
    if (unknownIngredients.length > 0) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a vegan food scientist. Analyze ingredients and return ONLY JSON." },
          { role: "user", content: `Analyze: ${unknownIngredients.join(', ')}. Return: {"is_vegan": boolean, "maybe": boolean, "flagged": ["item1"], "explanation": "short string"}` }
        ],
        response_format: { type: "json_object" }
      });

      const aiJson = JSON.parse(response.choices[0].message.content || '{}');

      if (!aiJson.is_vegan || aiJson.maybe) {
        status = aiJson.maybe ? 'maybe_vegan' : 'non_vegan';
        const aiFlaggedFormatted = aiJson.flagged.map((f: string) => ({ name: f }));
        finalFlagged = [...finalFlagged, ...aiFlaggedFormatted];
      }
    }

    const flaggedNames = [...new Set(finalFlagged.map(f => f.name))];
    const explanation = flaggedNames.length > 0 
      ? `Analysis complete. Flagged: ${flaggedNames.join(', ')}.`
      : "All ingredients appear to be vegan.";

    // 4. Save to Memory for future users
    await supabase.from('products').insert({
      ingredient_text: cleanRawText,
      vegan_status: status,
      flagged_ingredients: flaggedNames,
      explanation: explanation
    });

    return NextResponse.json({ status, flagged: flaggedNames, explanation, cached: false });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
