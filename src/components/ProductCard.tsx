import React from 'react';
import { Product } from '../types';
import { ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const score = product.score ?? 100;
  const category = product.category_rating ?? 'Best';

  const getBadgeStyle = () => {
    switch (category) {
      case 'Best':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Better':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between group"
    >
      <div className="p-5 space-y-4">
        {/* Top: Brand, Category and Score Pill */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {product.brand}
            </span>
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors">
              {product.name}
            </h3>
          </div>

          <div
            className={`px-2.5 py-1 rounded-xl font-bold text-xs border flex items-center gap-1.5 shrink-0 ${getBadgeStyle()}`}
          >
            <span className="text-sm">{score}</span>
            <span className="text-[10px] font-normal text-slate-400">/100</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Badges / Metrics */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium capitalize">
            {product.category}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
            {product.ingredient_count || 0} ingredients
          </span>
          {(product.concern_count ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {product.concern_count} concern(s)
            </span>
          )}
          {(product.allergen_count ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              Allergen flag
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
        <span>View Full Safety Breakdown</span>
        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
};
