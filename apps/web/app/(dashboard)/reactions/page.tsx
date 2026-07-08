'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Plus, Trash2, AlertTriangle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { getReactions, logReaction, deleteReaction } from '../../../lib/api';

const SEVERITIES = [
  { value: 'MILD', label: 'Mild (Redness, itching)' },
  { value: 'MODERATE', label: 'Moderate (Rashes, swelling)' },
  { value: 'SEVERE', label: 'Severe (Hives, burns, peeling)' },
];

export default function ReactionsPage() {
  const [reactions, setReactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [ingredientName, setIngredientName] = useState('');
  const [reactionType, setReactionType] = useState('Allergy');
  const [severity, setSeverity] = useState('MILD');
  const [notes, setNotes] = useState('');
  const [productUsed, setProductUsed] = useState('');
  const [date, setDate] = useState('');

  const loadReactions = async () => {
    setIsLoading(true);
    try {
      const res = await getReactions();
      if (res.success) {
        setReactions(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientName) return;
    setSubmitLoading(true);
    setError('');
    try {
      const res = await logReaction({
        ingredientName,
        reactionType,
        severity,
        notes,
        productUsed,
        date: date || undefined,
      });
      if (res.success) {
        setIngredientName('');
        setNotes('');
        setProductUsed('');
        setDate('');
        setSeverity('MILD');
        loadReactions();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to log reaction.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reaction log?')) return;
    try {
      const res = await deleteReaction(id);
      if (res.success) {
        setReactions(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete reaction:', err);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'MILD':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'MODERATE':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'SEVERE':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <History className="w-8 h-8 text-teal-400" />
          My Reactions Log
        </h1>
        <p className="text-slate-400">Keep a record of chemicals that cause skin or health issues to customize safety warnings.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Log Form */}
        <div className="md:col-span-1 glass-card p-6 space-y-6 h-fit">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-400" />
            Log New Reaction
          </h3>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ingredient Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Methylparaben..."
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
                className="glass-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Reaction Type</label>
              <input
                type="text"
                required
                placeholder="e.g. Contact Dermatitis"
                value={reactionType}
                onChange={(e) => setReactionType(e.target.value)}
                className="glass-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="glass-input w-full text-sm"
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Product Responsible</label>
              <input
                type="text"
                placeholder="e.g. Lavender Shampoo"
                value={productUsed}
                onChange={(e) => setProductUsed(e.target.value)}
                className="glass-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date Triggered</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full text-sm text-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Additional Notes</label>
              <textarea
                placeholder="Describe the symptoms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="glass-input w-full h-24 text-sm resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitLoading || !ingredientName}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Reaction'}
            </button>
          </form>
        </div>

        {/* Reactions List */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white">Logged History ({reactions.length})</h3>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : reactions.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p>No reactions logged. Use the form on the left to start tracking allergy triggers.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reactions.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 flex justify-between gap-4"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-white font-bold text-lg">{r.ingredient.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getSeverityBadge(r.severity)}`}>
                        {r.severity}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>
                        <strong>Reaction Type:</strong> {r.reactionType}
                      </div>
                      {r.productUsed && (
                        <div>
                          <strong>Product:</strong> {r.productUsed}
                        </div>
                      )}
                    </div>

                    {r.notes && (
                      <p className="text-slate-300 text-sm italic bg-slate-900/30 p-2.5 rounded-lg border border-slate-800">
                        "{r.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-start">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
