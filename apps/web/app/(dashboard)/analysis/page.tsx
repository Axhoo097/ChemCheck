'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Filter, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatRiskScore } from '../../../lib/utils';
import { getAnalysisHistory } from '../../../lib/api';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'GROCERY', label: 'Grocery' },
  { value: 'COSMETIC', label: 'Cosmetic' },
  { value: 'SKINCARE', label: 'Skincare' },
  { value: 'HAIRCARE', label: 'Haircare' },
  { value: 'FOOD', label: 'Food & Snacks' },
  { value: 'BEVERAGE', label: 'Beverages' },
];

export default function AnalysisListPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const res = await getAnalysisHistory({ category, page, limit: 12 });
        if (res.success) {
          setHistory(res.data || []);
          setTotal(res.pagination?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [category, page]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8 text-teal-400" />
            Analysis Reports
          </h1>
          <p className="text-slate-400">Browse all chemical safety scans and ingredient breakdowns.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400 w-full md:w-auto">
          <Filter className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>
        
        <select 
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="glass-input w-full md:w-64"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-slate-900 text-white">
              {c.label}
            </option>
          ))}
        </select>
        
        <div className="flex-1 text-right text-sm text-slate-400 w-full">
          Showing <span className="font-semibold text-white">{history.length}</span> of <span className="font-semibold text-white">{total}</span> reports
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-xl font-bold text-white">No Reports Found</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            You haven't scanned any products in this category yet. Go to the Scanner tab to run an analysis!
          </p>
          <Link href="/scanner" className="inline-block bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
            Scan a Product
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((scan, i) => {
            const score = scan.toxicityReport?.overallScore ?? 0;
            const risk = formatRiskScore(score);
            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 flex flex-col justify-between hover:border-teal-500/30 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider bg-slate-900 px-2.5 py-1 rounded text-slate-400">
                      {scan.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${risk.color}`}>
                      {score}/100
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-teal-400 transition-colors line-clamp-1">
                      {scan.name}
                    </h3>
                    <p className="text-sm text-slate-500">{scan.brand || 'Unknown Brand'}</p>
                  </div>

                  {scan.toxicityReport?.aiSummary && (
                    <p className="text-sm text-slate-400 line-clamp-3">
                      {scan.toxicityReport.aiSummary}
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-700/50 mt-6 pt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(scan.toxicityReport?.createdAt || scan.updatedAt).toLocaleDateString()}</span>
                  <Link href={`/analysis/${scan.id}`} className="flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                    View Report <ArrowRight className="w-3.5 h-3.5" />
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
