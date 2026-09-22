import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { Ingredient } from '../types';

export const IngredientDictionary: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [allergensOnly, setAllergensOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngredients();
  }, [searchQuery, riskFilter]);

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/ingredients?page_size=100`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (riskFilter !== 'all') url += `&risk_level=${riskFilter}`;

      const res = await fetch(url).then((r) => r.json());
      if (res.success) {
        setIngredients(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch ingredients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = allergensOnly ? ingredients.filter((i) => i.is_allergen) : ingredients;

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search 100+ cosmetic & food ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            {(['all', 'low', 'medium', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  riskFilter === lvl
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {lvl} Risk
              </button>
            ))}
          </div>

          <button
            onClick={() => setAllergensOnly(!allergensOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              allergensOnly
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Allergens Only
          </button>
        </div>
      </div>

      {/* Grid of Ingredients */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading ingredient database...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold">No ingredients match your criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Try broadening your search term or clearing the risk filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ing) => (
            <div
              key={ing.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{ing.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase shrink-0 ${
                      ing.risk_level === 'low'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : ing.risk_level === 'medium'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {ing.risk_level} risk
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {ing.function}
                  </span>
                  {ing.is_allergen && (
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      Allergen
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 capitalize">
                    {ing.evidence_level} evidence
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {ing.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Deduction weight: {ing.risk_level === 'low' ? '0 pts' : ing.risk_level === 'medium' ? '8 pts' : '20 pts'}</span>
                <span>ID: {ing.id.slice(0, 8)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
