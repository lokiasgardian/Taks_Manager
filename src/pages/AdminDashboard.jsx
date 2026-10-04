import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api/adminApi';
import { useAuth } from '../context/AuthContext';
import { formatDisplayDate } from '../utils/dateUtils';

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();

  // Overview Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Daily Usage
  const [usageRange, setUsageRange] = useState(30); // 7, 14, 30 days
  const [dailyUsage, setDailyUsage] = useState([]);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // User Management
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [error, setError] = useState(null);

  // Fetch Overview Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await adminApi.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load system stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Daily Usage
  const fetchUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const now = new Date();
      const fromDate = new Date(now.getTime() - (usageRange - 1) * 24 * 60 * 60 * 1000);
      const toStr = now.toISOString().split('T')[0];
      const fromStr = fromDate.toISOString().split('T')[0];

      const res = await adminApi.getDailyUsage({ from: fromStr, to: toStr });
      if (res.success && Array.isArray(res.data)) {
        setDailyUsage(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily usage:', err);
    } finally {
      setLoadingUsage(false);
    }
  }, [usageRange]);

  // Fetch Users List
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await adminApi.getUsers({
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalUsersCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Toggle User Status
  const handleToggleStatus = async (userToUpdate) => {
    if (userToUpdate._id === currentUser?._id) return;

    const newStatus = !userToUpdate.isActive;
    setUpdatingUserId(userToUpdate._id);

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userToUpdate._id ? { ...u, isActive: newStatus } : u
      )
    );

    try {
      await adminApi.updateUserStatus(userToUpdate._id, newStatus);
      fetchStats(); // update active stats
    } catch (err) {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userToUpdate._id
            ? { ...u, isActive: userToUpdate.isActive }
            : u
        )
      );
      setError(err.message || 'Failed to update user status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRefreshAll = () => {
    setError(null);
    fetchStats();
    fetchUsage();
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">👑</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-violet-300 to-purple-200 bg-clip-text text-transparent">
                Super Admin Dashboard
              </h1>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Real-time platform activity, user counts, and engagement analytics
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <svg
              className="w-4 h-4 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm flex justify-between items-center animate-fadeIn">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-white text-lg font-bold leading-none ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* 1. Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Users
              </span>
              <span className="p-2 rounded-xl bg-violet-600/15 text-violet-400 text-lg">
                👥
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loadingStats ? '...' : stats?.totalUsers || 0}
              </span>
              {stats?.newUsersToday > 0 && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +{stats.newUsersToday} today
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Registered accounts across platform
            </p>
          </div>

          {/* Card 2: Active Users Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Today
              </span>
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 text-lg">
                ⚡
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loadingStats ? '...' : stats?.activeUsersToday || 0}
              </span>
              <span className="text-xs text-slate-400">unique users</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              IST timezone activity (Asia/Kolkata)
            </p>
          </div>

          {/* Card 3: Total Tasks Created */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Tasks
              </span>
              <span className="p-2 rounded-xl bg-blue-500/15 text-blue-400 text-lg">
                📝
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loadingStats ? '...' : stats?.totalTasks || 0}
              </span>
              <span className="text-xs text-slate-400">tasks created</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats?.completedTasks || 0} completed so far
            </p>
          </div>

          {/* Card 4: Completion Rate */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Completion Rate
              </span>
              <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-lg">
                🎯
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">
                {loadingStats ? '...' : `${stats?.completionRate || 0}%`}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats?.completionRate || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Daily Usage Activity Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>📈 Daily Platform Usage</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Activity breakdown per day in IST timezone
              </p>
            </div>

            {/* Range Selector */}
            <div className="flex gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setUsageRange(days)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    usageRange === days
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Last {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Table of Daily Activity */}
          {loadingUsage ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">
              Loading usage trends...
            </div>
          ) : dailyUsage.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No activity logs recorded in this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Active Users</th>
                    <th className="py-3 px-3">Signups</th>
                    <th className="py-3 px-3">Logins</th>
                    <th className="py-3 px-3">Tasks Created</th>
                    <th className="py-3 px-3">Tasks Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dailyUsage.map((day) => (
                    <tr
                      key={day.date}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {formatDisplayDate(day.date)}
                      </td>
                      <td className="py-3 px-3 font-medium text-amber-300">
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {day.activeUsers}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-medium">
                        {day.signups > 0 ? `+${day.signups}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{day.logins}</td>
                      <td className="py-3 px-3 text-violet-300 font-medium">
                        {day.tasksCreated}
                      </td>
                      <td className="py-3 px-3 text-emerald-300 font-medium">
                        {day.tasksCompleted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. User Management Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>👥 User Management</span>
                <span className="text-xs font-normal text-slate-400">
                  ({totalUsersCount} registered)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Privacy preserved: only task counts and account activity are displayed
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-52 sm:w-64"
              />

              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          {loadingUsers ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No matching users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Total Tasks</th>
                    <th className="py-3 px-3">Last Login</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const isSelf = u._id === currentUser?._id;
                    const isUpdating = updatingUserId === u._id;

                    return (
                      <tr
                        key={u._id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100">
                            {u.name}
                          </div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>

                        <td className="py-3 px-3">
                          {u.role === 'superadmin' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Super Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {u.taskCount} {u.taskCount === 1 ? 'task' : 'tasks'}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-400">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : 'Never'}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-500 italic">
                              Current Admin
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleStatus(u)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                u.isActive
                                  ? 'bg-red-500/15 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                              }`}
                            >
                              {isUpdating
                                ? 'Updating...'
                                : u.isActive
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Page {page} of {totalPages}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    page <= 1
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                  }`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    page >= totalPages
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
