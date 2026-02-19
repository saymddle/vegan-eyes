"use client";
import React, { useState, useRef } from 'react';
import { Camera, Search, Loader2, Trash2, Info, Beaker, Leaf, History, Layers } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function VeganEyes() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectRecipe = (text: string) => {
    const triggers = ['cup', 'tsp', 'tbsp', 'pound', 'lb', 'oz', 'gram', 'serves', 'grated', 'melted'];
    return triggers.some(t => text.toLowerCase().includes(t));
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setLoading(true);
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setInput(text.replace(/\s+/g, ' ').trim());
    } catch (err) {
      console.error("Scan Error");
    } finally {
      setIsScanning(false);
      setLoading(false);
    }
  };

  const checkIngredients = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: input }),
      });
      const data = await res.json();
      const isRecipe = detectRecipe(input);
      setResult({ ...data, isRecipe });
    } catch (err) {
      setResult({ status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex flex-col max-w-md mx-auto font-sans pb-32">
      <header className="p-8 text-center bg-white/50 backdrop-blur-sm">
        <h1 className="text-2xl font-black text-[#10b981] italic uppercase tracking-tighter">Vegan Eyes</h1>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Deep Intelligence Lab</p>
      </header>

      <div className="px-6 space-y-4">
        <div className="relative group bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <textarea 
            className="w-full p-5 h-20 rounded-2xl outline-none text-zinc-800 placeholder:text-zinc-300 resize-none transition-all focus:h-40"
            placeholder="Scan recipe or paste list..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && <button onClick={() => {setInput(''); setResult(null);}} className="absolute top-4 right-4 text-zinc-300"><Trash2 size={16} /></button>}
        </div>

        <div className="flex gap-3">
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageScan} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 py-4 rounded-2xl font-bold text-zinc-500">
            {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />} Scan
          </button>
          <button onClick={checkIngredients} className="flex-[2] flex items-center justify-center gap-2 bg-[#10b981] text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-transform">
            {loading && !isScanning ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Check</>}
          </button>
        </div>

        {result && (
          <div className="pt-4 space-y-6">
            <div className={`p-8 rounded-[2.5rem] text-white shadow-xl ${result.status === 'vegan' ? 'bg-emerald-500' : 'bg-[#ff2d55]'}`}>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">{result.status.replace('_', ' ')}</h2>
              {result.isRecipe && <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-80">Chef Mode Active</p>}
            </div>

            {result.flagged?.map((item: any, idx: number) => (
              <div key={idx} className="bg-white rounded-[2rem] border border-zinc-100 p-7 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                   {item.is_complex && <Layers size={14} className="text-amber-500" />}
                   <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{item.is_complex ? 'Complex' : 'Single'} Ingredient</span>
                </div>
                <h3 className="text-xl font-black text-zinc-800 uppercase mb-4">{item.name}</h3>
                
                <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 mb-4">
                  <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">{result.isRecipe ? 'How to Veganize' : 'Direct Swap'}</span>
                  <p className="text-base font-bold text-zinc-700 leading-tight">
                    {result.isRecipe ? (item.swap_functional || item.swap_static) : item.swap_static}
                  </p>
                </div>
                
                <div className="flex items-start gap-2 px-1 border-t border-zinc-50 pt-4 mt-2">
                  <Info size={14} className="mt-0.5 text-zinc-400" />
                  <p className="text-[11px] font-medium text-zinc-700 italic leading-relaxed">
                    "{item.nourishment_fact || 'Analyzing nutritional impact...'}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4-ICON MINIMAL NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 p-6 flex justify-around items-center z-50">
        <Camera size={24} className="text-emerald-500" />
        <Search size={24} className="text-zinc-300" />
        <Beaker size={24} className="text-zinc-300" />
        <Leaf size={24} className="text-zinc-300" />
      </nav>
    </main>
  );
}
