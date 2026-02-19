import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. Log configuration status to Vercel Logs
  if (!supabaseUrl || !supabaseKey) {
    console.error("LAB ERROR: Environment variables are missing in Vercel settings.");
    return NextResponse.json({ 
      status: 'error', 
      explanation: 'Database connection not configured in Vercel.' 
    }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { ingredients } = await req.json();
    
    // 2. Normalize input
    const ingredientList = ingredients
      .toLowerCase()
      .split(/[,\n]/)
      .map((i: string) => i.replace(/^[0-9\s/./]+(cup|tbsp|tsp|oz|g|ml|lb|qty)?\s+/i, '').trim())
      .filter((i: string) => i.length > 0);

    // 3. Query Database
    const { data: foundItems, error } = await supabase
      .from('ingredients')
      .select('name, vegan_status, nourishment_fact, difficulty_weight, swap_static, swap_functional, is_complex')
      .in('name', ingredientList);

    if (error) {
      console.error("DATABASE ERROR:", error.message);
      throw error;
    }

    const flagged = foundItems?.filter(item => item.vegan_status === 'non_vegan') || [];
    let status = flagged.length > 0 ? 'non_vegan' : (foundItems?.length === 0 ? 'unclear' : 'vegan');

    return NextResponse.json({ status, flagged });

  } catch (error: any) {
    console.error('SYSTEM CRASH:', error.message);
    return NextResponse.json({ status: 'error', details: error.message }, { status: 500 });
  }
}
