import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(req: Request) {
  if (!supabase) return NextResponse.json({ status: 'error' }, { status: 500 });

  try {
    const { ingredients } = await req.json();
    
    // Normalize input to lowercase for matching
    const ingredientList = ingredients
      .toLowerCase()
      .split(/[,\n]/)
      .map((i: string) => i.replace(/^[0-9\s/./]+(cup|tbsp|tsp|oz|g|ml|lb|qty)?\s+/i, '').trim())
      .filter((i: string) => i.length > 0);

    // Fetch from Supabase
    const { data: foundItems, error } = await supabase
      .from('ingredients')
      .select('name, vegan_status, nourishment_fact, difficulty_weight, swap_static, swap_functional, is_complex')
      .in('name', ingredientList);

    if (error) throw error;

    const flagged = foundItems?.filter(item => item.vegan_status === 'non_vegan') || [];
    
    let status = 'vegan';
    if (flagged.length > 0) status = 'non_vegan';
    if (!foundItems || foundItems.length === 0) status = 'unclear';

    return NextResponse.json({ status, flagged });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
