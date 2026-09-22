import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CustomFormulaModal } from './components/CustomFormulaModal';
import { IngredientDictionary } from './components/IngredientDictionary';
import { LabelScanner } from './components/LabelScanner';
import { SensitivityTracker } from './components/SensitivityTracker';
import { ApiExplorer } from './components/ApiExplorer';
import { Product, Ingredient } from './types';
import { Search, Plus, Filter, Sparkles, Shield, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('products');
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCustomFormulaOpen, setIsCustomFormulaOpen] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Check health on mount
  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => setApiHealthy(data.success))
      .catch(() => setApiHealthy(false));

    fetch('/api/v1/ingredients?page_size=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAllIngredients(data.data);
      });
  }, []);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/products?page_size=50';
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url).then((r) => r.json());
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'cleanser', 'shampoo', 'sunscreen', 'serum', 'moisturizer'];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} apiHealthy={apiHealthy} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Top Bar: Search, Category Filter, and Custom Sandbox Button */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search catalog products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsCustomFormulaOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Formula Sandbox
              </button>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Calculating safety metrics...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                <Shield className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="font-semibold text-base">No products found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try changing your category or search keywords.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ingredients' && <IngredientDictionary />}

        {activeTab === 'scanner' && <LabelScanner />}

        {activeTab === 'sensitivities' && <SensitivityTracker />}

        {activeTab === 'api' && <ApiExplorer />}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSelectAlternative={(alt) => setSelectedProduct(alt)}
        />
      )}

      {/* Custom Formula Sandbox Modal */}
      {isCustomFormulaOpen && (
        <CustomFormulaModal
          allIngredients={allIngredients}
          onClose={() => setIsCustomFormulaOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© 2026 ChemCheck. Deterministic cosmetic and food ingredient safety scoring engine.</p>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            Positioned as an educational tool • Scores reflect risk categories, not medical claims.
          </p>
        </div>
      </footer>
    </div>
  );
};
