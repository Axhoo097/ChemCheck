'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Heart } from 'lucide-react';
import Link from 'next/link';
import { formatRiskScore } from '../../../../lib/utils';
import { getAnalysisReport, generateProductRecommendations, addFavorite, removeFavorite, getFavorites } from '../../../../lib/api';

export default function AnalysisReportPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError('');
      try {
        const [reportRes, recsRes, favsRes] = await Promise.all([
          getAnalysisReport(productId),
          generateProductRecommendations(productId).catch(() => ({ success: false, data: null })),
          getFavorites().catch(() => ({ success: false, data: [] })),
        ]);

        if (reportRes.success && reportRes.data) {
          setProduct(reportRes.data);
        } else {
          setError('Failed to load analysis report.');
        }

        if (recsRes.success) {
          setRecommendations(recsRes.data);
        }

        if (favsRes.success && Array.isArray(favsRes.data)) {
          const found = favsRes.data.some((f: any) => f.productId === productId);
          setIsFavorited(found);
        }
      } catch (err) {
        console.error('Error fetching analysis details:', err);
        setError('Failed to load report data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [productId]);

  const handleToggleFavorite = async () => {
    if (!product || favLoading) return;
    setFavLoading(true);
    try {
      if (isFavorited) {
        await removeFavorite(product.id);
        setIsFavorited(false);
      } else {
        await addFavorite(product.id);
        setIsFavorited(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setFavLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Error Loading Report</h2>
        <p className="text-slate-400">{error || 'Product not found.'}</p>
        <Link href="/dashboard" className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const score = product.toxicityReport?.overallScore ?? 0;
  const risk = formatRiskScore(score);
  const ingredients = product.ingredients || [];

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 glass-card hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
            <p className="text-slate-400">{product.brand} • {product.category}</p>
          </div>
        </div>

        <button 
          onClick={handleToggleFavorite}
          disabled={favLoading}
          className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
            isFavorited 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30' 
              : 'glass-card border-slate-700 text-slate-400 hover:text-rose-400'
          }`}
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-1 glass-card p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-fit">
          {/* Background glow based on score */}
          <div className={`absolute inset-0 opacity-10 blur-[80px] ${
            score <= 30 ? 'bg-emerald-500' : score <= 65 ? 'bg-amber-500' : 'bg-red-500'
          }`} />
          
          <h2 className="text-lg font-medium text-slate-300 mb-6">ChemCheck Score</h2>
          
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle className="text-slate-800 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
              <circle 
                className={`${risk.color.split(' ')[0].replace('bg-', 'text-')} stroke-current`} 
                strokeWidth="8" 
                strokeLinecap="round" 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - (251.2 * score) / 100}
              ></circle>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white">{score}</span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-full font-bold uppercase tracking-wider text-sm ${risk.color}`}>
            {risk.label}
          </div>
          
          <p className="mt-4 text-sm text-slate-400">
            Higher score indicates higher toxicity risk.
          </p>
        </motion.div>

        {/* Ingredients Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
            Ingredient Breakdown
          </h2>
          
          <div className="space-y-4">
            {ingredients.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400">
                No ingredients found for this product.
              </div>
            ) : (
              ingredients.map((pi: any, idx: number) => {
                const ing = pi.ingredient;
                const isSafe = ing.riskScore <= 30;
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.05 }}
                    key={pi.id} 
                    className={`glass-card p-4 border-l-4 ${isSafe ? 'border-l-emerald-500' : ing.riskScore > 70 ? 'border-l-red-500' : 'border-l-amber-500'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {isSafe ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                        <div>
                          <h3 className="font-bold text-white text-lg">{ing.name}</h3>
                          {ing.inciName && <p className="text-xs text-slate-500">INCI: {ing.inciName}</p>}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${isSafe ? 'bg-emerald-500/20 text-emerald-400' : ing.riskScore > 70 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        Risk: {ing.riskScore}/100
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{ing.description || 'No description available for this chemical.'}</p>
                    
                    {/* Banned warnings */}
                    {ing.isBanned && (
                      <div className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded p-2 inline-block">
                        ⚠️ Banned in: {Array.isArray(ing.bannedIn) ? ing.bannedIn.join(', ') : ing.bannedIn || 'Some regions'}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* AI Summary and Warnings */}
      {product.toxicityReport && (
        <div className="glass-card p-8 bg-slate-900/50 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            AI Safety Assessment
          </h2>
          <p className="text-slate-300 leading-relaxed mb-4">{product.toxicityReport.aiSummary}</p>
          
          {product.toxicityReport.warnings && product.toxicityReport.warnings.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Warnings:</h4>
              <ul className="list-disc pl-5 text-sm text-amber-400 space-y-1">
                {product.toxicityReport.warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Alternatives Section */}
      {recommendations && (recommendations.recommended_products?.length > 0 || recommendations.ingredient_alternatives?.length > 0) && (
        <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-800">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Safer Alternatives
          </h2>
          <p className="text-slate-400 mb-6">AI-curated recommendations without the harmful chemicals found in this product.</p>
          
          {recommendations.recommended_products?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {recommendations.recommended_products.map((alt: any, idx: number) => {
                const altScore = alt.score ?? 15;
                return (
                  <Link href={`/analysis/${alt.id || alt.productId || '#'}`} key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between hover:border-indigo-500/50 transition-colors cursor-pointer group">
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{alt.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Toxicity Score: {alt.overallScore ?? 15}</span>
                        {alt.brand && <span className="text-xs text-slate-400">{alt.brand}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}

          {recommendations.ingredient_alternatives?.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Ingredient Alternatives:</h4>
              <div className="grid gap-3">
                {recommendations.ingredient_alternatives.map((alt: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/30 border border-slate-800 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-slate-300 font-medium">Instead of <strong className="text-red-400">{alt.harmful}</strong></span>
                    <span className="text-sm text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Use: {alt.safe?.join(', ') || 'Safer botanicals'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
