'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, Activity, Search, ArrowRight, ScanLine, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-teal-500" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300">
            ChemCheck
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link 
            href="/signup" 
            className="text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-sm text-teal-400 mb-8 backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          AI-Powered Safety Engine v1.0
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight"
        >
          Know exactly what you&apos;re <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-400">
            putting on your body.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl"
        >
          Scan barcodes or ingredients to instantly uncover hidden toxins, track allergic reactions, and get AI-curated safer alternatives tailored for you.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link 
            href="/scanner" 
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_35px_rgba(20,184,166,0.6)] hover:-translate-y-1"
          >
            <ScanLine className="w-5 h-5" />
            Scan a Product
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:-translate-y-1"
          >
            Explore Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-slate-800/50 bg-slate-900/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Enterprise-grade chemical intelligence.</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Our AI engine cross-references FDA, WHO, and EWG databases to give you the most accurate toxicity reports in milliseconds.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <ScanLine className="w-8 h-8 text-teal-400" />,
              title: "Instant OCR Scanning",
              desc: "Take a picture of the ingredients list. Our AI instantly parses and scores every single chemical."
            },
            {
              icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
              title: "Toxicity Grading",
              desc: "Products are rigorously graded into Best, Better, and Worst categories based on cumulative chemical risk."
            },
            {
              icon: <Activity className="w-8 h-8 text-emerald-400" />,
              title: "Smart Alternatives",
              desc: "Allergic to parabens? Our recommendation engine suggests the safest, highly-rated alternatives."
            }
          ].map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="glass-card p-8 group hover:bg-slate-800/80 transition-all hover:-translate-y-2 cursor-default"
            >
              <div className="bg-slate-900/80 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-700 group-hover:border-teal-500/50 transition-colors shadow-inner">
                {feat.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feat.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
