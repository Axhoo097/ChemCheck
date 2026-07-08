'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale, Search, ArrowRight, Check, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { searchProducts, compareProducts } from '../../../lib/api';
import { formatRiskScore } from '../../../lib/utils';

export default function ComparePage() {
  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');
  const [resultsA, setResultsA] = useState<any[]>([]);
  const [resultsB, setResultsB] = useState<any[]>([]);
  const [productA, setProductA] = useState<any>(null);
  const [productB, setProductB] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoadingA, setSearchLoadingA] = useState(false);
  const [searchLoadingB, setSearchLoadingB] = useState(false);

  // Debounced search for Product A
  useEffect(() => {
    if (!queryA) {
      setResultsA([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoadingA(true);
      try {
        const res = await searchProducts({ q: queryA, limit: 5 });
        if (res.success) setResultsA(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoadingA(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [queryA]);

  // Debounced search for Product B
  useEffect(() => {
    if (!queryB) {
      setResultsB([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoadingB(true);
      try {
        const res = await searchProducts({ q: queryB, limit: 5 });
        if (res.success) setResultsB(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoadingB(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [queryB]);

  const handleCompare = async () => {
    if (!productA || !productB) return;
    setIsLoading(true);
    try {
      const res = await compareProducts([productA.id, productB.id]);
      if (res.success) {
        setComparison(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearComparison = () => {
    setProductA(null);
    setProductB(null);
    setComparison(null);
    setQueryA('');
    setQueryB('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Scale className="w-8 h-8 text-teal-400" />
          Compare Products
        </h1>
        <p className="text-slate-400">Select two products to run a side-by-side safety comparison.</p>
      </div>

      {!comparison ? (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Selector A */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-teal-400">Product A</h3>
            {productA ? (
              <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{productA.name}</h4>
                  <p className="text-xs text-slate-500">{productA.brand} • {productA.category}</p>
                </div>
                <button onClick={() => setProductA(null)} className="text-xs text-red-400 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={queryA}
                    onChange={(e) => setQueryA(e.target.value)}
                    placeholder="Search product A (e.g. Himalaya)..."
                    className="glass-input w-full pl-10"
                  />
                  <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                  {searchLoadingA && <Loader2 className="w-4 h-4 text-teal-400 animate-spin absolute right-3 top-4" />}
                </div>

                {resultsA.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                    {resultsA.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProductA(p);
                          setResultsA([]);
                          setQueryA('');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-700/50 border-b border-slate-700/30 text-sm text-white flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.brand} • {p.category}</p>
                        </div>
                        <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-teal-400">Score: {p.toxicityReport?.overallScore ?? 'N/A'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selector B */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-indigo-400">Product B</h3>
            {productB ? (
              <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{productB.name}</h4>
                  <p className="text-xs text-slate-500">{productB.brand} • {productB.category}</p>
                </div>
                <button onClick={() => setProductB(null)} className="text-xs text-red-400 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={queryB}
                    onChange={(e) => setQueryB(e.target.value)}
                    placeholder="Search product B (e.g. Nivea)..."
                    className="glass-input w-full pl-10"
                  />
                  <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                  {searchLoadingB && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin absolute right-3 top-4" />}
                </div>

                {resultsB.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                    {resultsB.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProductB(p);
                          setResultsB([]);
                          setQueryB('');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-700/50 border-b border-slate-700/30 text-sm text-white flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.brand} • {p.category}</p>
                        </div>
                        <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-indigo-400">Score: {p.toxicityReport?.overallScore ?? 'N/A'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trigger Button */}
          <div className="md:col-span-2 text-center pt-4">
            <button
              onClick={handleCompare}
              disabled={isLoading || !productA || !productB}
              className="bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed px-10 py-4 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(20,184,166,0.2)]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Run Comparison'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Comparison Results Table */}
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300">
                  <th className="p-4 font-semibold">Criteria</th>
                  <th className="p-4 font-semibold text-teal-400 text-center w-1/3">{comparison.products[0].name}</th>
                  <th className="p-4 font-semibold text-indigo-400 text-center w-1/3">{comparison.products[1].name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-white text-sm">
                <tr>
                  <td className="p-4 font-medium text-slate-400">Brand</td>
                  <td className="p-4 text-center">{comparison.products[0].brand}</td>
                  <td className="p-4 text-center">{comparison.products[1].brand}</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-400">Category</td>
                  <td className="p-4 text-center">{comparison.products[0].category}</td>
                  <td className="p-4 text-center">{comparison.products[1].category}</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-400">Safety Score</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${formatRiskScore(comparison.products[0].toxicityReport?.overallScore ?? 0).color}`}>
                      {comparison.products[0].toxicityReport?.overallScore ?? 'N/A'}/100
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${formatRiskScore(comparison.products[1].toxicityReport?.overallScore ?? 0).color}`}>
                      {comparison.products[1].toxicityReport?.overallScore ?? 'N/A'}/100
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-400">Verdict</td>
                  <td className="p-4 text-center text-slate-300 font-medium">
                    {formatRiskScore(comparison.products[0].toxicityReport?.overallScore ?? 0).label}
                  </td>
                  <td className="p-4 text-center text-slate-300 font-medium">
                    {formatRiskScore(comparison.products[1].toxicityReport?.overallScore ?? 0).label}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI Winner Recommendation */}
          {comparison.recommendation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 bg-gradient-to-br from-teal-950/20 via-slate-900 to-indigo-950/20 border-teal-500/20">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-teal-400" />
                AI Winner Recommendation
              </h3>
              <p className="text-slate-300 text-base leading-relaxed">{comparison.recommendation.reason}</p>
            </motion.div>
          )}

          {/* Common vs Unique Ingredients */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Common Ingredients ({comparison.commonIngredients?.length || 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {comparison.commonIngredients?.length === 0 ? (
                  <span className="text-sm text-slate-500">No common ingredients.</span>
                ) : (
                  comparison.commonIngredients.map((name: string, idx: number) => (
                    <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded">
                      {name}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Unique Ingredients Comparison
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-teal-400 uppercase mb-2">Only in {comparison.products[0].name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {comparison.uniqueIngredients?.[0]?.length === 0 ? (
                      <span className="text-xs text-slate-500">None</span>
                    ) : (
                      comparison.uniqueIngredients[0].map((name: string, idx: number) => (
                        <span key={idx} className="bg-teal-950/20 text-teal-300 border border-teal-500/10 text-xs px-2 py-0.5 rounded">
                          {name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase mb-2">Only in {comparison.products[1].name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {comparison.uniqueIngredients?.[1]?.length === 0 ? (
                      <span className="text-xs text-slate-500">None</span>
                    ) : (
                      comparison.uniqueIngredients[1].map((name: string, idx: number) => (
                        <span key={idx} className="bg-indigo-950/20 text-indigo-300 border border-indigo-500/10 text-xs px-2 py-0.5 rounded">
                          {name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <button onClick={clearComparison} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Compare Other Products
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
