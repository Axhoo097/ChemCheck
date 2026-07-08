'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Search, AlertCircle, Loader2, BarChart2, Check, X, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { getAdminDashboard, getAdminProducts, getAdminUsers, getAdminLogs, updateAdminProduct, updateAdminUser } from '../../../lib/api';

export default function AdminPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, isLoading, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, prodRes, usersRes, logsRes] = await Promise.all([
        getAdminDashboard(),
        getAdminProducts({ limit: 10 }),
        getAdminUsers({ limit: 10 }),
        getAdminLogs({ limit: 10 }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (prodRes.success) setProducts(prodRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (logsRes.success) setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleApproveProduct = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await updateAdminProduct(id, { status: 'APPROVED' });
      if (res.success) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProduct = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await updateAdminProduct(id, { status: 'REJECTED' });
      if (res.success) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'REJECTED' } : p));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserActive = async (id: string, currentActive: boolean) => {
    setActionLoading(id);
    try {
      const res = await updateAdminUser(id, { isActive: !currentActive });
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !currentActive } : u));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-slate-400">You must be an administrator to view this page.</p>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-teal-400" />
          Admin Panel
        </h1>
        <p className="text-slate-400">Manage products, approve manual scans, control user accounts, and view audits.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-card p-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Users</h4>
          <p className="text-2xl font-bold text-white">{stats.stats.totalUsers}</p>
        </div>
        <div className="glass-card p-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Products</h4>
          <p className="text-2xl font-bold text-white">{stats.stats.totalProducts}</p>
        </div>
        <div className="glass-card p-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Reports</h4>
          <p className="text-2xl font-bold text-white">{stats.stats.totalReports}</p>
        </div>
        <div className="glass-card p-5 border-amber-500/20">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pending Approvals</h4>
          <p className="text-2xl font-bold text-amber-400">{stats.stats.pendingProducts}</p>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Products Table */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-teal-500" />
            Product Approvals
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-white">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-2">Name</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/20">
                    <td className="py-3 font-medium">
                      <p className="truncate max-w-[150px]">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.brand}</p>
                    </td>
                    <td className="py-3">{p.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                        p.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {p.status === 'PENDING' && (
                        <div className="flex justify-end gap-1">
                          <button
                            disabled={actionLoading === p.id}
                            onClick={() => handleApproveProduct(p.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            disabled={actionLoading === p.id}
                            onClick={() => handleRejectProduct(p.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            User Management
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-white">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-2">User</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/20">
                    <td className="py-3">
                      <p className="font-medium truncate max-w-[150px]">{u.name}</p>
                      <p className="text-[10px] text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 font-semibold text-slate-400">{u.role}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {u.isActive ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {u.id !== user.id && (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => handleToggleUserActive(u.id, u.isActive)}
                          className={`px-2 py-1 rounded font-semibold text-[10px] ${
                            u.isActive ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {u.isActive ? 'Block' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Audit Logs
        </h3>
        <div className="space-y-3">
          {logs.map((log, idx) => (
            <div key={log.id || idx} className="bg-slate-900/30 border border-slate-800/80 p-3 rounded-lg text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong className="text-teal-400">{log.admin?.name || 'Admin'}</strong>
                <span className="mx-1.5 text-slate-500">•</span>
                <span className="font-semibold text-slate-100">{log.action}</span>
                <span className="mx-1.5 text-slate-500">•</span>
                <span>Type: {log.entityType} (ID: {log.entityId.substring(0, 8)}...)</span>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
