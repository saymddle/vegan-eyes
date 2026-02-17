"use client";
import React, { useState, useRef } from 'react';
import { Camera, Search, Loader2, RefreshCw, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';

export default function VeganEyes() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
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
      setInput(text.replace(/\s+/g, ' ').trim().toLowerCase());
    } catch (err) {
      alert("Scan failed. Try manual entry.");
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-6 max-w-md mx-auto font-sans">
      <header className="w-full py-8 text-center">
        <h1 className="text-3xl font-black text-emerald-600 tracking-tighter italic">VEGAN EYES</h1>
        <div className="h-1 w-12 bg-emerald-600 mx-auto rounded-full mt-1"></div>
      </header>

      <div className="w-full space-y-5">
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageScan} />

        <div className="relative group">
          <textarea 
            className="w-full p-5 h-44 rounded-[2rem] border-none bg-white shadow-xl shadow-emerald-900/5 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-zinc-800 placeholder:text-zinc-400 text-base"
            placeholder="Scan or paste ingredients list..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-zinc-100 py-4 rounded-2xl font-bold text-zinc-600 active:scale-95 transition-all"
          >
            {isScanning ? <RefreshCw className="animate-spin" /> : <Camera size={20} />} Scan
          </button>
          
          <button 
            onClick={checkIngredients}
            disabled={loading || !input}
            className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />} Check Ingredients
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-8 rounded-[2.5rem] text-white shadow-2xl animate-in zoom-in-95 duration-300 ${
            result.status === 'vegan' ? 'bg-emerald-500' : 
            result.status === 'non_vegan' ? 'bg-rose-500' : 'bg-amber-500'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {result.status === 'vegan' && <CheckCircle2 size={32} />}
              {result.status === 'non_vegan' && <AlertCircle size={32} />}
              {result.status === 'maybe_vegan' && <HelpCircle size={32} />}
              <h2 className="text-3xl font-black uppercase tracking-tighter">{result.status.replace('_', ' ')}</h2>
            </div>
            <p className="text-sm font-semibold opacity-90 leading-snug">{result.explanation}</p>
          </div>
        )}
      </div>
    </main>
  );
}
