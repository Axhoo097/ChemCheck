'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, ScanLine, FileText, Scale, Users, History, Settings, LogOut, Menu, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan Product', href: '/scanner', icon: ScanLine },
  { name: 'Analysis Reports', href: '/analysis', icon: FileText },
  { name: 'Compare', href: '/compare', icon: Scale },
  { name: 'Recommendations', href: '/recommendations', icon: ShieldCheck },
  { name: 'My Reactions', href: '/reactions', icon: History },
  { name: 'Community', href: '/community', icon: Users },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();

  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  // Auth protection check
  useEffect(() => {
    // Check if token exists in localStorage first for instant hydration
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSignOut = () => {
    dispatch(logout());
    router.push('/login');
  };

  // Get user initials
  const getInitials = () => {
    if (!user || !user.name) return 'U';
    const parts = user.name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Show page loader if checking auth
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400 mb-4" />
        <p className="text-slate-400 font-medium">Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-800/90 border-r border-slate-700/50 backdrop-blur-xl transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col"
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-700/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-teal-500" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300">
              ChemCheck
            </span>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-30">
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex justify-end items-center gap-6">
            <Link href="/profile" className="flex items-center gap-3 group">
              <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">{user?.name}</span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-amber-400 p-[2px] cursor-pointer">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-slate-300">{getInitials()}</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
