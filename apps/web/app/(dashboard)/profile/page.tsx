'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertCircle, Loader2, Sparkles, Plus, X } from 'lucide-react';
import { getProfile, updateProfile } from '../../../lib/api';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../../store/slices/authSlice';

const SKIN_TYPES = [
  { value: 'NORMAL', label: 'Normal Skin' },
  { value: 'OILY', label: 'Oily Skin' },
  { value: 'DRY', label: 'Dry Skin' },
  { value: 'COMBINATION', label: 'Combination Skin' },
  { value: 'SENSITIVE', label: 'Sensitive Skin' },
];

const HAIR_TYPES = [
  { value: 'NORMAL', label: 'Normal Hair' },
  { value: 'OILY', label: 'Oily Scalp' },
  { value: 'DRY', label: 'Dry Scalp' },
  { value: 'CURLY', label: 'Curly Hair' },
  { value: 'STRAIGHT', label: 'Straight Hair' },
  { value: 'WAVY', label: 'Wavy Hair' },
  { value: 'COILY', label: 'Coily Hair' },
];

const ALLERGEN_OPTIONS = ['parabens', 'sulfates', 'silicones', 'fragrance', 'triclosan', 'phthalate', 'formaldehyde', 'coal tar', 'hydroquinone', 'peanuts', 'gluten', 'dairy', 'soy'];
const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher'];

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [skinType, setSkinType] = useState('NORMAL');
  const [hairType, setHairType] = useState('NORMAL');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dispatch = useDispatch();

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await getProfile();
        if (res.success && res.data) {
          const u = res.data;
          setName(u.name || '');
          if (u.profile) {
            setSkinType(u.profile.skinType || 'NORMAL');
            setHairType(u.profile.hairType || 'NORMAL');
            setAllergies(u.profile.allergies || []);
            setDietaryPrefs(u.profile.dietaryPrefs || []);
            setAge(u.profile.age || '');
            setGender(u.profile.gender || '');
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await updateProfile({
        name,
        skinType,
        hairType,
        allergies,
        dietaryPrefs,
        age: age === '' ? undefined : Number(age),
        gender: gender || undefined,
      });
      if (res.success) {
        setSuccess('Profile updated successfully!');
        
        // Re-dispatch updated credentials to update the layout header
        if (res.data) {
          dispatch(setCredentials({
            user: {
              id: res.data.id,
              name: res.data.name,
              email: res.data.email,
              role: res.data.role,
              avatarUrl: res.data.avatarUrl
            },
            token: localStorage.getItem('token') || ''
          }));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleAllergy = (tag: string) => {
    setAllergies(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleDietary = (tag: string) => {
    setDietaryPrefs(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8 text-teal-400" />
          Profile Settings
        </h1>
        <p className="text-slate-400">Configure your safety metrics, skin types, and allergen triggers.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core details */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-700/50 pb-3">Personal Details</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input w-full text-sm"
                placeholder="Your Name"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="glass-input w-full text-sm"
                placeholder="e.g. 28"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Gender</label>
              <input
                type="text"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="glass-input w-full text-sm"
                placeholder="e.g. Female"
              />
            </div>
          </div>
        </div>

        {/* Skin & Hair Types */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-700/50 pb-3">Skin & Hair Profile</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Skin Type</label>
              <select
                value={skinType}
                onChange={(e) => setSkinType(e.target.value)}
                className="glass-input w-full text-sm"
              >
                {SKIN_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Hair / Scalp Type</label>
              <select
                value={hairType}
                onChange={(e) => setHairType(e.target.value)}
                className="glass-input w-full text-sm"
              >
                {HAIR_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700/50 pb-3">Chemical Allergies / Irritants</h3>
          <p className="text-xs text-slate-400">Select any chemicals or ingredients you react poorly to. We will flag products containing these in red.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {ALLERGEN_OPTIONS.map((tag) => {
              const active = allergies.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleAllergy(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tag}
                  {active ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-650" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-700/50 pb-3">Dietary Preferences</h3>
          <p className="text-xs text-slate-400">Select any food lifestyle or dietary preferences to filter recommendations.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {DIETARY_OPTIONS.map((tag) => {
              const active = dietaryPrefs.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleDietary(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-teal-500/20 border-teal-500/40 text-teal-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tag}
                  {active ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-650" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <div className="text-right">
          <button
            type="submit"
            disabled={submitLoading}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(20,184,166,0.2)]"
          >
            {submitLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
