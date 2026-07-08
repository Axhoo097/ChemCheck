'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Star, ThumbsUp, MessageSquare, Loader2, AlertCircle, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getCommunityFeed, upvoteReview, searchProducts, createReview } from '../../../lib/api';

export default function CommunityPage() {
  const [feed, setFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Write review state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFeed = async () => {
    try {
      const res = await getCommunityFeed({ limit: 20 });
      if (res.success) {
        setFeed(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  // Search product to review
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchProducts({ q: searchQuery, limit: 5 });
        if (res.success) setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUpvote = async (reviewId: string) => {
    try {
      const res = await upvoteReview(reviewId);
      if (res.success) {
        setFeed(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !comment) return;
    setSubmitLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await createReview(selectedProduct.id, { rating, title, comment });
      if (res.success) {
        setSuccess('Review posted successfully!');
        setTitle('');
        setComment('');
        setSelectedProduct(null);
        setSearchQuery('');
        loadFeed();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post review. You may have reviewed this product already.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Users className="w-8 h-8 text-teal-400" />
          Community Board
        </h1>
        <p className="text-slate-400">Share your experiences and read feedback on safety ratings from other users.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Feed list */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-teal-500" />
            Recent Product Reviews
          </h3>

          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : feed.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400 border border-slate-700/50">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p>No community reviews yet. Be the first to share one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((rev, i) => (
                <motion.div
                  key={rev.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white">{rev.user?.name || 'Jane Doe'}</h4>
                      <p className="text-xs text-slate-500">
                        Reviewed product:{' '}
                        <Link href={`/analysis/${rev.productId}`} className="text-teal-400 hover:underline inline-flex items-center gap-0.5">
                          {rev.product?.name || 'Product'} <ArrowRight className="w-3 h-3" />
                        </Link>
                      </p>
                    </div>

                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-4 h-4 ${idx < rev.rating ? 'fill-current' : 'text-slate-700'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {rev.title && <h5 className="font-semibold text-white text-sm">{rev.title}</h5>}
                    <p className="text-slate-300 text-sm">{rev.comment}</p>
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Posted {new Date(rev.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleUpvote(rev.id)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-teal-400 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{rev.helpfulCount} helpful</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Write Review Form */}
        <div className="md:col-span-1 glass-card p-6 space-y-6 h-fit">
          <h3 className="text-lg font-bold text-white">Write a Review</h3>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Product</label>
              {selectedProduct ? (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                  <span className="font-semibold text-white truncate mr-2">{selectedProduct.name}</span>
                  <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-red-400 hover:underline">Clear</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product to review..."
                    className="glass-input w-full pl-8 text-xs"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
                  
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-slate-850 border border-slate-700 rounded-lg shadow-lg z-15 max-h-40 overflow-y-auto">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(p);
                            setSearchResults([]);
                          }}
                          className="w-full text-left p-2 hover:bg-slate-700 text-xs text-white border-b border-slate-700/30"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Rating</label>
              <div className="flex gap-1 text-slate-400">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    className="hover:scale-115 transition-transform"
                  >
                    <Star className={`w-6 h-6 ${val <= rating ? 'text-amber-400 fill-current' : 'text-slate-750'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Review Title</label>
              <input
                type="text"
                placeholder="Summarize your review..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Review Comments</label>
              <textarea
                required
                placeholder="What did you think of the safety profile, scent, or effectiveness?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="glass-input w-full h-32 text-xs resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitLoading || !selectedProduct || !comment}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
