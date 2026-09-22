import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Trash2, AlertTriangle, ShieldCheck, History } from 'lucide-react';
import { UserSensitivity, UserReaction, Ingredient } from '../types';

export const SensitivityTracker: React.FC = () => {
  const [sensitivities, setSensitivities] = useState<UserSensitivity[]>([]);
  const [reactions, setReactions] = useState<UserReaction[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [severityNote, setSeverityNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSens, resReacts, resIngs] = await Promise.all([
        fetch('/api/v1/me/sensitivities', { headers: { 'x-user-id': 'demo-user-123' } }).then((r) => r.json()),
        fetch('/api/v1/me/reactions', { headers: { 'x-user-id': 'demo-user-123' } }).then((r) => r.json()),
        fetch('/api/v1/ingredients?page_size=100').then((r) => r.json()),
      ]);

      if (resSens.success) setSensitivities(resSens.data);
      if (resReacts.success) setReactions(resReacts.data);
      if (resIngs.success) setAllIngredients(resIngs.data);
    } catch (err) {
      console.error('Failed to load sensitivities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSensitivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId) return;

    try {
      const res = await fetch('/api/v1/me/sensitivities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user-123',
        },
        body: JSON.stringify({
          ingredient_id: selectedIngredientId,
          severity_note: severityNote || 'User specified sensitivity',
        }),
      }).then((r) => r.json());

      if (res.success) {
        setSelectedIngredientId('');
        setSeverityNote('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add sensitivity:', err);
    }
  };

  const handleDeleteSensitivity = async (ingredientId: string) => {
    try {
      await fetch(`/api/v1/me/sensitivities/${ingredientId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'demo-user-123' },
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete sensitivity:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Personal Sensitivity Profile</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              Active User
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ingredients added here trigger automated -15 pt penalties and visual warnings when analyzing products.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Skin Profile</span>
            <span className="font-semibold text-slate-800">Sensitive</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Active Sensitivities</span>
            <span className="font-bold text-emerald-600">{sensitivities.length} flagged</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add Sensitivity Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            Add New Sensitivity
          </h3>

          <form onSubmit={handleAddSensitivity} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Ingredient
              </label>
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              >
                <option value="">-- Choose from ingredient catalog --</option>
                {allIngredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.risk_level} risk{i.is_allergen ? ', allergen' : ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Personal Reaction Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Causes redness, burning sensation, contact eczema"
                value={severityNote}
                onChange={(e) => setSeverityNote(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedIngredientId}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              Save to Profile
            </button>
          </form>
        </div>

        {/* Center/Right: List of Saved Sensitivities */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Active Saved Sensitivities ({sensitivities.length})
            </h3>
            <span className="text-xs text-slate-400">Layered in Phase 4 personalization</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading profile data...</div>
          ) : sensitivities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No sensitivities saved yet. Add one from the form on the left!
            </div>
          ) : (
            <div className="space-y-3">
              {sensitivities.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {s.ingredient?.name || 'Unknown Ingredient'}
                      </span>
                      {s.ingredient?.is_allergen && (
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Known Allergen
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {s.ingredient?.risk_level} risk
                      </span>
                    </div>
                    {s.severity_note && (
                      <p className="text-xs text-slate-600 italic">"{s.severity_note}"</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteSensitivity(s.ingredient_id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove sensitivity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
