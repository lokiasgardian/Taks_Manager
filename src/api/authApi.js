const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic request helper with credentials and JSON error handling
 */
const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(
      `Auth API Error on [${options.method || 'GET'}] ${url}:`,
      error.message
    );
    throw error;
  }
};

export const authApi = {
  /**
   * Register a new user
   * @param {{ name: string, email: string, password: string }} credentials
   */
  signup: (credentials) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  /**
   * Login user
   * @param {{ email: string, password: string }} credentials
   */
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  /**
   * Logout user
   */
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  /**
   * Get current authenticated user profile
   */
  getMe: () => request('/auth/me'),
};

export default authApi;
