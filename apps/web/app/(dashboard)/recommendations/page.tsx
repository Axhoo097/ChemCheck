'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Filter, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getPersonalizedRecommendations } from '../../../lib/api';
import { formatRiskScore } from '../../../lib/utils';

const CATEGORIES = [
  { value: '', label: 'All recommendations' },
  { value: 'SKINCARE', label: 'Skincare' },
  { value: 'HAIRCARE', label: 'Haircare' },
  { value: 'COSMETIC', label: 'Cosmetic' },
  { value: 'FOOD', label: 'Food & Snacks' },
];

export default function RecommendationsPage() {
  const [activeCategory, setActiveCategory] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      setIsLoading(true);
      try {
        const res = await getPersonalizedRecommendations({ category: activeCategory });
        if (res.success) {
          setRecommendations(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load personalized recommendations:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecommendations();
  }, [activeCategory]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-teal-400" />
            Personalized Recommendations
          </h1>
          <p className="text-slate-400">Products selected and scored according to your skin type, hair type, and allergens.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-slate-900/50 rounded-xl overflow-x-auto gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`py-2.5 px-5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
              activeCategory === cat.value
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-xl font-bold text-white">No Recommendations Ready</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            Try updating your profile details (allergies and skin types) under your Profile settings to help us customize matches for you!
          </p>
          <Link href="/profile" className="inline-block bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
            Configure Profile
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {recommendations.map((rec, i) => {
            const prod = rec.product;
            if (!prod) return null;
            const score = prod.toxicityReport?.overallScore ?? 15;
            const risk = formatRiskScore(score);
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 flex flex-col justify-between hover:border-teal-500/30 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider bg-slate-900 px-2.5 py-1 rounded text-slate-400">
                      {prod.category}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${risk.color}`}>
                        Toxicity: {score}/100
                      </span>
                      <span className="text-xs text-teal-400 mt-1 font-semibold">Match Score: {Math.round(rec.score)}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-teal-400 transition-colors line-clamp-1">
                      {prod.name}
                    </h3>
                    <p className="text-sm text-slate-500">{prod.brand}</p>
                  </div>

                  <p className="text-sm text-slate-300 bg-slate-900/30 border border-slate-800 rounded-lg p-3">
                    ✨ <strong className="text-teal-400">AI Match Verdict:</strong> {rec.reason}
                  </p>
                </div>

                <div className="border-t border-slate-700/50 mt-6 pt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Generated recently</span>
                  <Link href={`/analysis/${prod.id}`} className="flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                    Analyze Ingredients <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
