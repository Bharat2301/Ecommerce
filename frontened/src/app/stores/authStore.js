import { create } from 'zustand';
import api from '@/utils/api';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  initialize: async () => {
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/api/auth/profile');
        if (response.data.success) {
          set({ user: response.data.data, isAuthenticated: true });
        }
      } catch (error) {
        Cookies.remove('token');
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false });
      }
    }
  },
  login: async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data.success) {
        const { token, user } = response.data.data;
        Cookies.set('token', token, { expires: 1 / 24 }); // 1 hour
        localStorage.setItem('token', token);
        set({ user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  },
  logout: async () => {
    try {
      await api.get('/api/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    Cookies.remove('token');
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },
  updateUser: (user) => {
    set((state) => ({ ...state, user }));
  },
}));