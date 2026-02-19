import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Safety Guard: Only initialize if keys exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json({ status: 'error', explanation: 'Database configuration missing.' }, { status: 500 });
  }

  try {
    const { ingredients } = await req.json();
    
    const ingredientList = ingredients
      .toLowerCase()
      .split(/[,\n]/)
      .map((i: string) => i.replace(/^[0-9\s/./]+(cup|tbsp|tsp|oz|g|ml|lb|qty)?\s+/i, '').trim())
      .filter((i: string) => i.length > 0);

    const { data: foundItems, error } = await supabase
      .from('ingredients')
      .select('name, vegan_status, nourishment_fact, difficulty_weight, swap_static, swap_functional, is_complex')
      .in('name', ingredientList);

    if (error) throw error;

    const flagged = foundItems?.filter(item => item.vegan_status === 'non_vegan') || [];
    
    let status = 'vegan';
    if (flagged.length > 0) status = 'non_vegan';
    if (!foundItems || foundItems.length === 0) status = 'unclear';

    return NextResponse.json({
      status,
      flagged,
      explanation: status === 'vegan' 
        ? "All detected ingredients are verified vegan." 
        : `Found ${flagged.length} non-vegan items.`,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ status: 'error', explanation: 'Analysis failed.' }, { status: 500 });
  }
}
