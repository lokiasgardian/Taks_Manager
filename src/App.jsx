import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Navbar from './components/Navbar';
import Todo from './todo/Todo';
import AdminDashboard from './pages/AdminDashboard';

const AppContent = () => {
  const { user, loading, isSuperAdmin } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [appView, setAppView] = useState('todo'); // 'todo' | 'admin'

  // Loading splash while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-violet-600/30 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse font-medium">
          Loading Calendar Todo...
        </p>
      </div>
    );
  }

  // If not authenticated, render Login or Signup screen
  if (!user) {
    if (authView === 'signup') {
      return <Signup onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <Login onNavigateToSignup={() => setAuthView('signup')} />;
  }

  // If user is not superadmin but appView is admin, fallback to todo
  const currentView = isSuperAdmin && appView === 'admin' ? 'admin' : 'todo';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Navbar currentView={currentView} onViewChange={setAppView} />
      <div className="flex-1">
        {currentView === 'admin' ? <AdminDashboard /> : <Todo />}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
