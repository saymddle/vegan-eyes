"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Loader2, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, FlaskConical, Leaf, Info, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function VeganEyes() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showLabView, setShowLabView] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setLoading(true);
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      const cleaned = text.replace(/\s+/g, ' ').trim();
      setInput(cleaned);
      setToast("Scan Captured!");
    } catch (err) {
      setToast("Scan failed. Try typing.");
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
      setResult(data);
      if (data.status === 'non_vegan' && data.flagged?.length > 0) {
        setExpandedItem(data.flagged[0].name);
        setShowLabView(true);
      }
    } catch (err) {
      setToast("Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex flex-col max-w-md mx-auto font-sans pb-24 relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      <header className="p-6 pb-2 text-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-black text-emerald-600 tracking-tighter italic">VEGAN EYES</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Deep Intelligence Lab</p>
      </header>

      <div className="flex-1 px-6 space-y-4 pt-4">
        {/* Compact & Expandable Input */}
        <div className="relative group">
          <textarea 
            className={`w-full p-4 rounded-2xl border-2 border-zinc-100 bg-white shadow-sm transition-all duration-300 outline-none text-zinc-800 placeholder:text-zinc-400 ${
              isFocused || input ? 'h-40 border-emerald-500/20 ring-4 ring-emerald-500/5' : 'h-14 overflow-hidden'
            }`}
            placeholder="Type, paste, or scan ingredients..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => !input && setIsFocused(false)}
          />
          {input && (
            <button onClick={() => {setInput(''); setResult(null);}} className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-100 text-zinc-400 hover:text-rose-500 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageScan} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 py-4 rounded-2xl font-bold text-zinc-600 active:scale-95 transition-all">
            {isScanning ? <RefreshCw className="animate-spin" size={20} /> : <Camera size={20} />} Scan
          </button>
          <button onClick={checkIngredients} disabled={loading || !input} className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />} Check
          </button>
        </div>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div className={`p-6 rounded-[2rem] text-white shadow-xl ${result.status === 'vegan' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {result.status === 'vegan' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  <h2 className="text-xl font-black uppercase tracking-tight">{result.status.replace('_', ' ')}</h2>
                </div>
                <button onClick={() => setShowLabView(!showLabView)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/10 text-white">
                  <FlaskConical size={12} /> {showLabView ? 'Hide Subs' : 'See Subs'}
                </button>
              </div>
              <p className="text-sm font-medium opacity-90 leading-relaxed">{result.explanation}</p>
            </div>

            {showLabView && result.flagged?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <Leaf size={14} className="text-emerald-600" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lab-Recommended Substitutes</span>
                </div>
                {result.flagged.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)} className="w-full flex items-center justify-between p-4 text-left">
                      <div>
                        <span className="text-xs font-black uppercase text-zinc-400 block mb-0.5">{item.function_logic || 'Function'}</span>
                        <span className="text-sm font-bold text-zinc-800">{item.name}</span>
                      </div>
                      {expandedItem === item.name ? <ChevronUp size={18} className="text-zinc-300" /> : <ChevronDown size={18} className="text-zinc-300" />}
                    </button>
                    {expandedItem === item.name && (
                      <div className="px-4 pb-4 space-y-4 animate-in fade-in">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                          <p className="text-[10px] font-black uppercase text-amber-600 mb-1">How to Veganize</p>
                          <p className="text-sm font-bold text-amber-900 mb-1">{item.vegan_substitute || 'Swap for a Plant-Based Mix'}</p>
                          <p className="text-xs text-amber-800/70">{item.sub_reasoning}</p>
                        </div>
                        <div className="px-1">
                          <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Nourishment Lab Note</span>
                          <p className="text-xs text-zinc-600 italic leading-relaxed">"{item.nourishment_fact}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-8 py-4 flex justify-between items-center max-w-md mx-auto z-50">
        <button className="text-emerald-600"><Camera size={24} /></button>
        <button className="text-zinc-300"><Search size={24} /></button>
        <button className="text-zinc-300"><FlaskConical size={24} /></button>
        <button className="text-zinc-300"><Leaf size={24} /></button>
      </nav>
    </main>
  );
}
