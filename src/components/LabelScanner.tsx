import React, { useState } from 'react';
import { Scan, Sparkles, AlertCircle, CheckCircle2, Copy, FileText } from 'lucide-react';
import { ScoreResult } from '../types';

export const LabelScanner: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    raw_text: string;
    matched: Array<{ token: string; ingredient: any; match_confidence: number }>;
    unmatched: string[];
    score: ScoreResult;
  } | null>(null);

  const presets = [
    {
      title: 'Gentle Cleanser Label',
      text: 'Water, Glycerin, Sodium Cocoyl Isethionate, Panthenol, Hyaluronic Acid, Allantoin, Xanthan Gum',
    },
    {
      title: 'Clarifying Shampoo Label',
      text: 'Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Sodium Chloride, Fragrance (Parfum), Phenoxyethanol, Citric Acid',
    },
    {
      title: 'Anti-Aging Night Elixir',
      text: 'Water, Glycerin, Retinol, Niacinamide, Squalane, Tocopherol (Vitamin E), Phenoxyethanol, BHT (Butylated Hydroxytoluene)',
    },
    {
      title: 'High-Risk Chemical Formulation',
      text: 'Water, Formaldehyde, DMDM Hydantoin, Triclosan, Fragrance (Parfum), Menthol, Mineral Oil',
    },
  ];

  const handleScan = async (textToScan = inputText) => {
    if (!textToScan.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/scan/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToScan }),
      }).then((r) => r.json());

      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scan className="w-5 h-5 text-emerald-600" />
            Ingredient Label Tokenizer & Instant Scoring
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Paste an ingredient list from a product box, bottle label, or e-commerce listing. The engine splits tokens, matches with our 100-ingredient safety registry, and calculates a live ChemCheck score.
          </p>
        </div>

        {/* Preset quick buttons */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Sample Labels:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(p.text);
                  handleScan(p.text);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <textarea
            rows={4}
            placeholder="e.g. Water, Glycerin, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Fragrance, Phenoxyethanol..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
          />

          <div className="flex justify-end">
            <button
              onClick={() => handleScan()}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing Formula...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Scan & Calculate Score
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
          {/* Score Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl bg-slate-50 border border-slate-200 gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold border ${
                  result.score.category === 'Best'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : result.score.category === 'Better'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <span className="text-2xl leading-none">{result.score.score}</span>
                <span className="text-[9px] uppercase font-semibold text-slate-500 mt-0.5">/ 100</span>
              </div>
              <div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    result.score.category === 'Best'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : result.score.category === 'Better'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {result.score.category} Tier
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  Matched {result.matched.length} ingredients • {result.score.concern_count} concerns • {result.score.allergen_count} allergens
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500">
              <span>Deterministic Deduction Engine</span>
            </div>
          </div>

          {/* Matched Breakdown */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Recognized Formulation Ingredients</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.matched.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{m.ingredient.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        m.ingredient.risk_level === 'low'
                          ? 'bg-emerald-100 text-emerald-700'
                          : m.ingredient.risk_level === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {m.ingredient.risk_level}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{m.ingredient.function}</p>
                  {m.ingredient.is_allergen && (
                    <span className="text-[10px] font-semibold text-rose-600 block">
                      ⚠ Recognized Allergen (+5 pt penalty)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unmatched Tokens if any */}
          {result.unmatched.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1 text-xs">
              <span className="font-bold text-amber-800">
                Unmatched terms ({result.unmatched.length}):
              </span>
              <p className="text-amber-700">
                {result.unmatched.join(', ')}
              </p>
              <p className="text-[11px] text-amber-600 italic">
                These terms did not match our standard curated dictionary; they were ignored in the numerical scoring.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
