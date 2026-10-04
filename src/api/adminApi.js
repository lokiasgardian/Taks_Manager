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
      `Admin API Error on [${options.method || 'GET'}] ${url}:`,
      error.message
    );
    throw error;
  }
};

export const adminApi = {
  /**
   * Get high level platform stats
   */
  getStats: () => request('/admin/stats'),

  /**
   * Get daily usage activity breakdown
   * @param {{ from?: string, to?: string }} [params={}]
   */
  getDailyUsage: ({ from, to } = {}) => {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const qs = query.toString();
    return request(`/admin/usage/daily${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get paginated user management list with task counts
   * @param {{ page?: number, limit?: number, search?: string, status?: string }} [params={}]
   */
  getUsers: ({ page = 1, limit = 10, search = '', status = '' } = {}) => {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('limit', String(limit));
    if (search) query.set('search', search);
    if (status) query.set('status', status);
    return request(`/admin/users?${query.toString()}`);
  },

  /**
   * Toggle user active/inactive status
   * @param {string} id
   * @param {boolean} isActive
   */
  updateUserStatus: (id, isActive) =>
    request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
};

export default adminApi;
