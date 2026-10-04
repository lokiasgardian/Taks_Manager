import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage for instant name & profile display
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('user');
    } catch {
      return false;
    }
  });
  const [error, setError] = useState(null);

  // Check current session in background without dropping saved user
  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken && !savedUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      if (savedToken) {
        const res = await authApi.getMe();
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
        }
      }
    } catch (err) {
      console.warn('Session check warning:', err.message);
      // If token is explicitly rejected and no saved user, clear
      if ((err.status === 401 || err.status === 403) && !savedUser) {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
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
        localStorage.setItem('user', JSON.stringify(res.user));
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
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
        localStorage.setItem('user', JSON.stringify(res.user));
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
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
      localStorage.removeItem('user');
      localStorage.removeItem('token');
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
