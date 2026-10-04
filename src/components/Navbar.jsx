import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ currentView, onViewChange }) => {
  const { user, logout, isSuperAdmin } = useAuth();

  return (
    <nav className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🗓️</span>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-purple-200 bg-clip-text text-transparent">
              Calendar Todo
            </span>
          </div>

          {/* Navigation Links for Super Admin */}
          {isSuperAdmin && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => onViewChange('todo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'todo'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                My Calendar
              </button>
              <button
                type="button"
                onClick={() => onViewChange('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'admin'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <span>Admin Dashboard</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </button>
            </div>
          )}
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          {/* Mobile view switch for Super Admin */}
          {isSuperAdmin && (
            <div className="sm:hidden flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onViewChange(currentView === 'todo' ? 'admin' : 'todo')
                }
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-violet-400"
              >
                {currentView === 'todo' ? 'Admin' : 'Calendar'}
              </button>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 py-1 px-2.5 rounded-xl text-xs">
            <span className="font-semibold text-slate-200 max-w-[120px] truncate">
              {user?.name}
            </span>
            {isSuperAdmin ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Admin
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300 uppercase tracking-wider">
                User
              </span>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sign out of your account"
            aria-label="Sign out"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
