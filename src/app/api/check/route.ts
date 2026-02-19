import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { ingredients } = await req.json();
    
    // 1. Clean and normalize the input
    const ingredientList = ingredients
      .toLowerCase()
      .split(/[,\n]/)
      .map((i: string) => i.replace(/^[0-9\s/./]+(cup|tbsp|tsp|oz|g|ml|lb|qty)?\s+/i, '').trim())
      .filter((i: string) => i.length > 0);

    // 2. Query Supabase for the 400+ Master Ingredients
    const { data: foundItems, error } = await supabase
      .from('ingredients')
      .select('name, vegan_status, explanation, nourishment_fact, difficulty_weight, swap_static, swap_functional, is_complex')
      .in('name', ingredientList);

    if (error) throw error;

    // 3. Separate vegan vs non-vegan
    const flagged = foundItems?.filter(item => item.vegan_status === 'non_vegan') || [];
    
    // 4. Determine final status
    let status = 'vegan';
    if (flagged.length > 0) status = 'non_vegan';
    if (foundItems?.length === 0) status = 'unclear';

    return NextResponse.json({
      status,
      flagged,
      explanation: status === 'vegan' 
        ? "All detected ingredients are verified vegan by the Lab." 
        : `Found ${flagged.length} non-vegan items requiring substitution.`,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ status: 'error', explanation: 'Lab Analysis failed.' }, { status: 500 });
  }
}
