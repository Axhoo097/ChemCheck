import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, ArrowRight, Info } from 'lucide-react';
import { Product, ScoreResult, AlternativeRecommendation } from '../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onSelectAlternative?: (altProduct: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSelectAlternative,
}) => {
  const [analysis, setAnalysis] = useState<ScoreResult | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [alternatives, setAlternatives] = useState<AlternativeRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [personalize, setPersonalize] = useState<boolean>(true);

  useEffect(() => {
    fetchAnalysis();
  }, [product.id, personalize]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      // Optional header simulation for demo user
      const headers: Record<string, string> = {};
      if (personalize) {
        headers['x-user-id'] = 'demo-user-123';
      }

      const [resAnalyze, resExplain, resAlts] = await Promise.all([
        fetch(`/api/v1/products/${product.id}/analyze`, { headers }).then((r) => r.json()),
        fetch(`/api/v1/products/${product.id}/explain`, { headers }).then((r) => r.json()),
        fetch(`/api/v1/products/${product.id}/alternatives`, { headers }).then((r) => r.json()),
      ]);

      if (resAnalyze.success) setAnalysis(resAnalyze.data);
      if (resExplain.success) setExplanation(resExplain.data.explanation);
      if (resAlts.success) setAlternatives(resAlts.data);
    } catch (err) {
      console.error('Failed to load product analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (category: string) => {
    switch (category) {
      case 'Best':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Best (Safe & Mild)' };
      case 'Better':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Better (Moderate Risk)' };
      default:
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Worst (High Concern)' };
    }
  };

  const badge = analysis ? getScoreBadge(analysis.category) : { bg: '', text: '' };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{product.brand}</span>
            <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Score Banner */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Calculating ChemCheck deterministic safety score...</p>
            </div>
          ) : analysis ? (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-bold border ${
                      analysis.category === 'Best'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : analysis.category === 'Better'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    <span className="text-3xl leading-none">{analysis.score}</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 mt-0.5">/ 100</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.text}
                      </span>
                      {analysis.personalized && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Personalized for you
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {analysis.concern_count} concern ingredient(s) • {analysis.allergen_count} recognized allergen(s)
                    </p>
                  </div>
                </div>

                {/* Personalization Toggle */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
                  <label htmlFor="toggle-personalize" className="cursor-pointer">
                    User Sensitivities
                  </label>
                  <input
                    id="toggle-personalize"
                    type="checkbox"
                    checked={personalize}
                    onChange={(e) => setPersonalize(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Personalized Warnings Alert */}
              {analysis.warnings && analysis.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Personal Sensitivity Warning Detected (-15 pts applied)</span>
                  </div>
                  <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
                    {analysis.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* LLM Plain English Summary */}
              {explanation && (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex gap-3 text-sm text-slate-700">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs uppercase tracking-wide mb-1">
                      Formula Summary & Safety Profile
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">{explanation}</p>
                  </div>
                </div>
              )}

              {/* Itemized Deductions Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-slate-900">Itemized Formula Deductions</h3>
                  <span className="text-xs text-slate-500">Starts at 100 points, deductions applied</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Ingredient</th>
                        <th className="py-2.5 px-3">Risk Tier</th>
                        <th className="py-2.5 px-3">Evidence</th>
                        <th className="py-2.5 px-3">Allergen?</th>
                        <th className="py-2.5 px-3 text-right">Points Deducted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {analysis.breakdown.map((item) => {
                        const isDeducted = item.points_deducted > 0;
                        return (
                          <tr key={item.ingredient_id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {item.name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                  item.risk_level === 'low'
                                    ? 'bg-slate-100 text-slate-600'
                                    : item.risk_level === 'medium'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {item.risk_level}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 capitalize text-slate-500">{item.evidence_level}</td>
                            <td className="py-2.5 px-3">
                              {item.is_allergen ? (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Yes (+5 pt)
                                </span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-semibold ${
                                isDeducted ? 'text-rose-600' : 'text-slate-400'
                              }`}
                            >
                              {isDeducted ? `-${item.points_deducted}` : '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Safer Alternatives Recommendation */}
              {alternatives.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Recommended Safer Alternatives</h3>
                      <p className="text-xs text-slate-500">Same category ({product.category}), ranked by safety score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {alternatives.slice(0, 2).map((alt) => (
                      <div
                        key={alt.product.id}
                        onClick={() => onSelectAlternative && onSelectAlternative(alt.product)}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">{alt.product.brand}</span>
                          <h4 className="font-semibold text-xs text-slate-900 truncate max-w-[180px]">
                            {alt.product.name}
                          </h4>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            Score: {alt.score}/100 • {alt.category}
                          </span>
                        </div>
                        <button className="text-slate-400 hover:text-emerald-600 p-1">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">Failed to calculate product score.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Informational ChemCheck Risk Category • Not medical advice</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
