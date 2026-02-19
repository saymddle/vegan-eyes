"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Loader2, Trash2, ShoppingCart, Beaker, Gauge, Layers, Info, Plus, History, ChevronUp } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function VeganEyes() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const detectContext = (text: string) => {
    const measurements = ['cup', 'tbsp', 'tsp', 'oz', 'gram', 'ml', 'lb', 'qty', 'pint'];
    return measurements.some(m => text.toLowerCase().includes(m));
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
      setToast(detectContext(text) ? "Recipe Mode Active" : "Product Scan Complete");
    } catch (err) {
      setToast("Scan failed.");
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
      if (data.status === 'error') throw new Error();
      
      const isRecipe = detectContext(input);
      const difficulty = data.flagged?.reduce((acc: number, item: any) => acc + (item.difficulty_weight || 1), 0) || 0;
      setResult({ ...data, isRecipe, difficulty });
    } catch (err) {
      setResult({ status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex flex-col max-w-md mx-auto font-sans pb-32 relative">
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">
          {toast}
        </div>
      )}

      <header className="p-6 text-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-black text-emerald-600 italic tracking-tighter uppercase">Vegan Eyes</h1>
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deep Intelligence Lab</p>
      </header>

      <div className="px-6 space-y-4 pt-6">
        <div className="relative group">
          <textarea 
            className="w-full p-4 h-16 rounded-2xl border-2 border-zinc-100 bg-white transition-all outline-none text-zinc-800 focus:h-40 focus:border-emerald-500/20"
            placeholder="Scan or type ingredients..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && <button onClick={() => {setInput(''); setResult(null);}} className="absolute top-3 right-3 p-1.5 text-zinc-300"><Trash2 size={16} /></button>}
        </div>

        <div className="flex gap-3 pb-4">
          {/* FIXED SCAN BUTTON */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageScan} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 py-4 rounded-2xl font-bold text-zinc-500 active:scale-95 transition-transform"
          >
            {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />} Scan
          </button>

          <button 
            onClick={checkIngredients} 
            className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
          >
            {loading && !isScanning ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Check</>}
          </button>
        </div>

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className={`p-8 rounded-[2.5rem] text-white shadow-xl ${result.status === 'vegan' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                {result.status === 'error' ? 'Error' : result.status.replace('_', ' ')}
              </h2>
              {result.isRecipe && <div className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80 italic">Chef Mode Active</div>}
            </div>

            {result.flagged?.map((item: any, idx: number) => (
              <div key={idx} className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                   {item.is_complex ? <Layers size={14} className="text-amber-500" /> : <div className="w-2 h-2 rounded-full bg-zinc-300" />}
                   <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">
                     {item.is_complex ? 'Complex' : 'Single'} Ingredient
                   </span>
                </div>
                <h3 className="text-xl font-black text-zinc-800 uppercase leading-none mb-4">{item.name}</h3>
                
                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 mb-4">
                  <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">
                    {result.isRecipe ? 'Functional Swap' : 'Direct Swap'}
                  </span>
                  <p className="text-base font-bold text-zinc-700 leading-tight">
                    {result.isRecipe ? (item.swap_functional || "N/A") : (item.swap_static || "N/A")}
                  </p>
                </div>
                
                <div className="flex items-start gap-2 px-1 opacity-60">
                  <Info size={14} className="mt-0.5" />
                  <p className="text-[11px] italic leading-relaxed">{item.nourishment_fact}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#4D4D4D] p-6 flex justify-around items-center rounded-t-[2.5rem] z-50">
        <button className="text-white/40"><History size={24} /></button>
        <button className="bg-white/20 p-4 rounded-full text-white shadow-inner border border-white/10"><Plus size={28} /></button>
        <button className="text-white/40"><ChevronUp size={24} /></button>
      </nav>
    </main>
  );
}
