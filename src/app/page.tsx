"use client";
import React, { useState, useRef } from 'react';
import { Camera, Search, Loader2, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, FlaskConical, Leaf, Info, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function VeganEyes() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showLabView, setShowLabView] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert("Scan failed. Try manual entry.");
    } finally {
      setIsScanning(false);
      setLoading(false);
    }
  };

  const clearAll = () => {
    setInput('');
    setResult(null);
    setShowLabView(false);
  };

  const checkIngredients = async () => {
    if (!input) return;
    setLoading(true);
    setResult(null);
    setShowLabView(false);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: input }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] flex flex-col max-w-md mx-auto font-sans pb-24">
      <header className="p-6 pb-2 text-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-black text-emerald-600 tracking-tighter italic">VEGAN EYES</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Deep Intelligence Lab</p>
      </header>

      <div className="flex-1 px-6 space-y-6 pt-4">
        <div className="relative">
          <textarea 
            className="w-full p-5 h-40 rounded-3xl border-2 border-zinc-50 bg-white shadow-sm focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-zinc-800 placeholder:text-zinc-400 text-base resize-none"
            placeholder="Tip: Scan the ingredient list on the back!"
            value={input ? "✅ Ingredients Captured. Ready to check." : ""}
            readOnly
          />
          {input && (
            <button onClick={clearAll} className="absolute top-4 right-4 p-2 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageScan} />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 py-4 rounded-2xl font-bold text-zinc-600 active:scale-95 transition-all"
          >
            {isScanning ? <RefreshCw className="animate-spin" /> : <Camera size={20} />} Scan
          </button>
          
          <button 
            onClick={checkIngredients}
            disabled={loading || !input}
            className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />} Check
          </button>
        </div>

        {result && result.status !== 'unclear' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <div className={`p-6 rounded-[2rem] text-white shadow-xl ${
              result.status === 'vegan' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {result.status === 'vegan' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  <h2 className="text-xl font-black uppercase tracking-tight">{result.status.replace('_', ' ')}</h2>
                </div>
                <button 
                  onClick={() => setShowLabView(!showLabView)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    showLabView ? 'bg-white text-emerald-600' : 'bg-black/10 text-white'
                  }`}
                >
                  <FlaskConical size={12} /> {showLabView ? 'Close Lab' : 'Lab View'}
                </button>
              </div>
              <p className="text-sm font-medium opacity-90">{result.explanation}</p>
            </div>

            {showLabView && result.flagged?.length > 0 && (
              <div className="space-y-3">
                {result.flagged.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div>
                        <span className="text-xs font-black uppercase text-zinc-400 block mb-0.5">{item.function_logic}</span>
                        <span className="text-sm font-bold text-zinc-800">{item.name}</span>
                      </div>
                      {expandedItem === item.name ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {expandedItem === item.name && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                          <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Suggested Substitute</p>
                          <p className="text-sm font-bold text-amber-900">{item.vegan_substitute || 'Check the Lab Recipes'}</p>
                          <p className="text-xs text-amber-800/70">{item.sub_reasoning}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Nourishment Fact</p>
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

        {result && result.status === 'unclear' && (
          <div className="p-6 rounded-[2rem] bg-zinc-800 text-white text-center">
            <HelpCircle size={32} className="mx-auto mb-2 text-zinc-400" />
            <p className="font-bold">{result.explanation}</p>
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
