'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, Search, ShieldAlert, Activity, ArrowRight, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatRiskScore } from '../../../lib/utils';
import { getUserStats, getAnalysisHistory } from '../../../lib/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState({ reactions: 0, favorites: 0, reviews: 0 });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, historyRes] = await Promise.all([
          getUserStats(),
          getAnalysisHistory({ limit: 5 }),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (historyRes.success) {
          setRecentScans(historyRes.data || []);
          setTotalScans(historyRes.pagination?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name || 'User'} 👋</h1>
          <p className="text-slate-400">Here's your chemical exposure summary for the week.</p>
        </div>
        <Link href="/scanner" className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)]">
          <ScanLine className="w-5 h-5" />
          New Scan
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-teal-500/10 text-teal-400 rounded-md">All-Time</span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Total Scans</h3>
          <p className="text-3xl font-bold text-white">{totalScans}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-amber-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Logged Reactions</h3>
          <p className="text-3xl font-bold text-amber-400">{stats.reactions}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Search className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Favorites</h3>
          <p className="text-3xl font-bold text-white">{stats.favorites}</p>
        </motion.div>
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Scans */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Scans</h2>
            <Link href="/analysis" className="text-sm text-teal-400 hover:text-teal-300">View all</Link>
          </div>
          
          <div className="space-y-4">
            {recentScans.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-400">
                No recent scans found. Head to the Scanner to scan your first product!
              </div>
            ) : (
              recentScans.map((scan, i) => {
                const score = scan.toxicityReport?.overallScore ?? 0;
                const risk = formatRiskScore(score);
                const dateStr = new Date(scan.toxicityReport?.createdAt || scan.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <motion.div 
                    key={scan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="w-16 h-16 bg-slate-900 rounded-lg border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {scan.imageUrl ? (
                        <img src={scan.imageUrl.startsWith('http') ? scan.imageUrl : `http://localhost:4000${scan.imageUrl}`} alt={scan.name} className="w-full h-full object-cover" />
                      ) : (
                        <ScanLine className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="font-semibold text-white">{scan.name}</h4>
                      <p className="text-sm text-slate-400">{scan.category} • {dateStr}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-700 pt-3 sm:pt-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">Score:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${risk.color}`}>
                          {score}/100 - {risk.label}
                        </span>
                      </div>
                      <Link href={`/analysis/${scan.id}`} className="text-slate-400 hover:text-white p-2">
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Tools */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Quick Tools</h2>
          
          <Link href="/scanner" className="block glass-card p-6 border-teal-500/30 bg-teal-900/10 hover:bg-teal-900/20 transition-all group">
            <Camera className="w-8 h-8 text-teal-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">OCR Scan</h3>
            <p className="text-sm text-slate-400">Take a photo of ingredients to instantly analyze them.</p>
          </Link>

          <Link href="/recommendations" className="block glass-card p-6 hover:bg-slate-800/80 transition-all group">
            <ShieldCheck className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">Personalized Matches</h3>
            <p className="text-sm text-slate-400">Find products safe for your allergies and skin type.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
