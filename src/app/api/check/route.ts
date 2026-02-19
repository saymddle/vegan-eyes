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
    
    // Check Cache
    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('ingredient_text', cleanRawText)
      .single();

    if (existingProduct) {
      return NextResponse.json({ ...existingProduct, status: existingProduct.vegan_status, flagged: existingProduct.flagged_ingredients, cached: true });
    }

    const fullList = cleanRawText.toLowerCase().replace(/[():.;\[\]*]/g, ',').split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 2);

    const { data: dbIngredients } = await supabase.from('ingredients').select('*').in('name', fullList);

    let finalFlaggedItems = dbIngredients?.filter((i: any) => i.vegan_status !== 'vegan') || [];
    let status = finalFlaggedItems.some(i => i.vegan_status === 'non_vegan') ? 'non_vegan' : 'vegan';

    const unknownIngredients = fullList.filter(i => !(dbIngredients?.map(d => d.name) || []).includes(i));

    if (unknownIngredients.length > 0) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a vegan food scientist. You must be binary: Vegan or Non-Vegan. If text is gibberish/unreadable, return {'error': 'unclear'}. Otherwise, return JSON." },
          { role: "user", content: `Analyze: ${unknownIngredients.join(', ')}. Return: {"is_vegan": boolean, "flagged": [{"name": "item", "reason": "why", "function": "what it does", "nourishment": "fact"}]}` }
        ],
        response_format: { type: "json_object" }
      });

      const aiJson = JSON.parse(response.choices[0].message.content || '{}');
      if (aiJson.error) return NextResponse.json({ status: 'unclear', explanation: "Text unclear. Please scan the ingredient list on the back of the package." });

      if (!aiJson.is_vegan) {
        status = 'non_vegan';
        const aiFlagged = aiJson.flagged.map((f: any) => ({
          name: f.name,
          vegan_status: 'non_vegan',
          function_logic: f.function || 'Unknown',
          nourishment_fact: f.nourishment || 'N/A',
          sub_reasoning: f.reason
        }));
        finalFlaggedItems = [...finalFlaggedItems, ...aiFlagged];
      }
    }

    const explanation = status === 'non_vegan' ? `Flagged ${finalFlaggedItems.length} items.` : "All items appear vegan.";

    await supabase.from('products').insert({
      ingredient_text: cleanRawText,
      vegan_status: status,
      flagged_ingredients: finalFlaggedItems,
      explanation: explanation
    });

    return NextResponse.json({ status, flagged: finalFlaggedItems, explanation, cached: false });
    
  } catch (error) {
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
