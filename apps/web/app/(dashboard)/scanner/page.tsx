'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Search, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { scanBarcode, scanOCR, analyzeText } from '../../../lib/api';

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState<'barcode' | 'ocr' | 'manual'>('barcode');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Barcode state
  const [barcode, setBarcode] = useState('');
  
  // OCR state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual state
  const [manualText, setManualText] = useState('');
  const [productName, setProductName] = useState('');
  
  const router = useRouter();

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await scanBarcode(barcode);
      if (res.success && res.data?.id) {
        router.push(`/analysis/${res.data.id}`);
      } else {
        setError('Could not scan barcode.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Product not found. Try OCR or manual entry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOcrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('productName', productName || 'OCR Scan Product');
      formData.append('category', 'COSMETIC'); // Default cosmetic

      const res = await scanOCR(formData);
      if (res.success && res.data?.id) {
        router.push(`/analysis/${res.data.id}`);
      } else {
        setError('Could not extract ingredients.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to extract ingredients. Try manual entry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await analyzeText(manualText, productName || 'Manual Analysis');
      if (res.success && res.data?.id) {
        router.push(`/analysis/${res.data.id}`);
      } else {
        setError('Failed to analyze ingredients.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Analysis failed. Check your ingredient text format.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analyze a Product</h1>
        <p className="text-slate-400">Choose how you want to input the product details for analysis.</p>
      </div>

      <div className="glass-card p-2 sm:p-4">
        {/* Tabs */}
        <div className="flex p-1 space-x-1 bg-slate-900/50 rounded-xl mb-6 overflow-x-auto">
          {[
            { id: 'barcode', name: 'Barcode Scan', icon: Search },
            { id: 'ocr', name: 'Ingredient OCR', icon: Camera },
            { id: 'manual', name: 'Manual Input', icon: Upload },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setError('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-8 bg-slate-900/30">
          
          {activeTab === 'barcode' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md w-full">
              <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Scan Barcode</h3>
              <p className="text-slate-400 mb-6">Enter a product barcode (e.g., 4005900002440 or 8901138510870) to search and analyze it.</p>
              
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2 w-full">
                <input 
                  type="text" 
                  required
                  placeholder="Enter barcode..." 
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="glass-input flex-1"
                />
                <button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[100px]">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze'}
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'ocr' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md w-full">
              <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
                <Camera className="w-10 h-10 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Ingredients Photo</h3>
              <p className="text-slate-400 mb-6">Upload a photo of the ingredients list on the back of the packaging.</p>
              
              <form onSubmit={handleOcrSubmit} className="space-y-4">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <input 
                  type="text" 
                  placeholder="Optional Product Name..." 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="glass-input w-full"
                />
                
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={selectFile}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5 text-slate-400" />
                    {selectedFile ? selectedFile.name : 'Select Image'}
                  </button>
                  
                  {selectedFile && (
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[100px]"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Scan OCR'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'manual' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-lg w-full">
              <h3 className="text-xl font-bold text-white mb-4">Paste Ingredients</h3>
              
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Product Name (e.g. My Moisturizer)" 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="glass-input w-full"
                />
                
                <textarea 
                  required
                  className="glass-input w-full h-40 resize-none" 
                  placeholder="Paste ingredients list here... (e.g. Aqua, Glycerin, Methylparaben, Fragrance)"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                ></textarea>
                
                <button type="submit" disabled={isLoading} className="w-full bg-teal-600 hover:bg-teal-500 text-white px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze Ingredients'}
                </button>
              </form>
            </motion.div>
          )}
        </div>
        
        <div className="mt-4 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200/80">
            Ensure good lighting when taking photos. Blurry text may lead to inaccurate AI analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
