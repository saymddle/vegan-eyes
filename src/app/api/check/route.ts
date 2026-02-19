import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ status: 'error' }, { status: 500 });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { ingredients } = await req.json();
    
    // NOISE FILTER: Strip out non-ingredient words to find the core noun
    const noiseWords = ['serves', 'filling', 'pound', 'lb', 'cup', 'tsp', 'tbsp', 'grated', 'melted', 'large', 'small', 'of', 'and'];
    
    const ingredientList = ingredients
      .toLowerCase()
      .split(/[,\n;>]/) // Split by common delimiters
      .map((line: string) => {
        let cleaned = line.replace(/[0-9./]/g, '').trim(); // Remove numbers
        noiseWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          cleaned = cleaned.replace(regex, '');
        });
        return cleaned.trim();
      })
      .filter((i: string) => i.length > 1);

    const { data: foundItems, error } = await supabase
      .from('ingredients')
      .select('*')
      .in('name', ingredientList);

    if (error) throw error;

    const flagged = foundItems?.filter(item => item.vegan_status === 'non_vegan') || [];
    let status = flagged.length > 0 ? 'non_vegan' : (foundItems?.length === 0 ? 'unclear' : 'vegan');

    return NextResponse.json({ status, flagged });
  } catch (error: any) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
