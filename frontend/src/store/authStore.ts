import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('reachinbox_token') : null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reachinbox_token', token);
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const user = await api.auth.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('reachinbox_token');
      }
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reachinbox_token');
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));
