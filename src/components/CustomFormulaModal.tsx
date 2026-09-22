import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Ingredient, ScoreResult } from '../types';

interface CustomFormulaModalProps {
  allIngredients: Ingredient[];
  onClose: () => void;
}

export const CustomFormulaModal: React.FC<CustomFormulaModalProps> = ({
  allIngredients,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentIngId, setCurrentIngId] = useState('');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = () => {
    if (currentIngId && !selectedIds.includes(currentIngId)) {
      const next = [...selectedIds, currentIngId];
      setSelectedIds(next);
      setCurrentIngId('');
      runScore(next);
    }
  };

  const handleRemove = (id: string) => {
    const next = selectedIds.filter((i) => i !== id);
    setSelectedIds(next);
    runScore(next);
  };

  const runScore = async (ids: string[]) => {
    if (ids.length === 0) {
      setScoreResult(null);
      return;
    }
    setLoading(true);
    try {
      const names = ids
        .map((id) => allIngredients.find((i) => i.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      const res = await fetch('/api/v1/scan/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: names }),
      }).then((r) => r.json());

      if (res.success) {
        setScoreResult(res.data.score);
      }
    } catch (err) {
      console.error('Failed to compute formula score:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Formula Sandbox & Safety Simulator
            </h2>
            <p className="text-xs text-slate-500">
              Combine cosmetic ingredients from the curated registry and see the live score deduction in real time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add ingredient row */}
          <div className="flex gap-2">
            <select
              value={currentIngId}
              onChange={(e) => setCurrentIngId(e.target.value)}
              className="flex-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">-- Pick an ingredient to add to formula --</option>
              {allIngredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.risk_level} risk {i.is_allergen ? '• allergen' : ''})
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!currentIngId}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Current Score Pill */}
          {scoreResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold border ${
                    scoreResult.category === 'Best'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : scoreResult.category === 'Better'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  <span className="text-xl leading-none">{scoreResult.score}</span>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 mt-0.5">/ 100</span>
                </div>
                <div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      scoreResult.category === 'Best'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : scoreResult.category === 'Better'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {scoreResult.category}
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    {scoreResult.concern_count} concerns • {scoreResult.allergen_count} allergens
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">100 - total deductions</span>
            </div>
          )}

          {/* List of current ingredients in formula */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Ingredients in Sandbox ({selectedIds.length})
            </h4>

            {selectedIds.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                No ingredients added yet. Pick one above to begin formulating.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedIds.map((id) => {
                  const ing = allIngredients.find((i) => i.id === id);
                  if (!ing) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{ing.name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            ing.risk_level === 'low'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ing.risk_level === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {ing.risk_level}
                        </span>
                        {ing.is_allergen && (
                          <span className="text-[10px] text-rose-600 font-bold">Allergen (+5)</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
