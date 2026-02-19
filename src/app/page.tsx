"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Loader2, RefreshCw, CheckCircle2, AlertCircle, FlaskConical, Leaf, Trash2, ShoppingCart, Beaker, Gauge } from 'lucide-react';
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
    const measurements = ['cup', 'tbsp', 'tsp', 'oz', 'gram', 'ml', 'lb', 'qty'];
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
      setToast(detectContext(text) ? "Recipe Captured!" : "Product Captured!");
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
    setResult(null);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: input }),
      });
      const data = await res.json();
      const isRecipe = detectContext(input);
      const difficulty = data.flagged?.reduce((acc: number, item: any) => acc + (item.difficulty_weight || 1), 0) || 0;
      setResult({ ...data, isRecipe, difficulty });
    } catch (err) {
      setToast("Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex flex-col max-w-md mx-auto font-sans pb-24 relative">
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      <header className="p-6 text-center border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-black text-emerald-600 italic tracking-tighter">VEGAN EYES</h1>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deep Intelligence Lab</span>
          {result?.isRecipe && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Recipe Mode</span>}
        </div>
      </header>

      <div className="flex-1 px-6 space-y-4 pt-6">
        <div className="relative group">
          <textarea 
            className="w-full p-4 h-14 rounded-2xl border-2 border-zinc-100 bg-white transition-all outline-none text-zinc-800 placeholder:text-zinc-400 focus:h-40 focus:border-emerald-500/20"
            placeholder="Scan or paste ingredients..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && (
            <button onClick={() => {setInput(''); setResult(null);}} className="absolute top-3 right-3 p-1.5 text-zinc-300">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageScan} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 py-4 rounded-2xl font-bold text-zinc-500">
            <Camera size={20} /> Scan
          </button>
          <button onClick={checkIngredients} disabled={loading || !input} className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200">
            {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />} Check
          </button>
        </div>

        {result && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className={`p-6 rounded-[2.5rem] text-white shadow-xl ${result.status === 'vegan' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              <h2 className="text-2xl font-black uppercase italic">{result.status.replace('_', ' ')}</h2>
              {result.difficulty > 0 && (
                <div className="mt-2 flex items-center gap-2 opacity-80">
                  <Gauge size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Complexity: {result.difficulty}/10</span>
                </div>
              )}
            </div>

            {result.flagged?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Beaker size={16} className="text-emerald-600" />
                    <span className="text-xs font-black uppercase text-zinc-400 tracking-widest">Lab Report</span>
                  </div>
                </div>

                {result.flagged.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{item.is_complex ? 'COMPOSITE INGREDIENT' : 'SINGLE INGREDIENT'}</span>
                        <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tight">{item.name}</h3>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Primary Swap</span>
                        <p className="text-sm font-bold text-zinc-700">{result.isRecipe ? item.swap_functional : item.swap_static}</p>
                      </div>
                      
                      <div className="bg-zinc-50 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ShoppingCart size={18} className="text-emerald-600" />
                          <div>
                            <span className="text-[8px] font-black text-zinc-400 uppercase">Lab Recommended Brand</span>
                            <p className="text-xs font-bold text-zinc-800">{item.brand_swap || 'Standard Pantry Item'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-[11px] text-zinc-400 italic leading-relaxed">"{item.nourishment_fact}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
