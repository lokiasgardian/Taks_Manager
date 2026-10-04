import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check current session on initial load
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signup = async ({ name, email, password }) => {
    setError(null);
    try {
      const res = await authApi.signup({ name, email, password });
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: 'Signup failed' };
    } catch (err) {
      const msg = err.message || 'Failed to create account';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const login = async ({ email, password }) => {
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: 'Login failed' };
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setError,
        clearError,
        login,
        signup,
        logout,
        checkAuth,
        isSuperAdmin: user?.role === 'superadmin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
