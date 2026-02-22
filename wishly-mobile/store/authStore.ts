import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_premium: boolean;
  is_online: boolean;
  theme: string;
  google_id: string | null;
  apple_id: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, username?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'full_name' | 'username' | 'avatar_url' | 'bio' | 'theme' | 'biometrics_enabled'>>) => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка входа';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (email, password, fullName, username) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName || null,
        username: username || null,
      });
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка регистрации';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  loginWithGoogle: async (credential) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/google', { credential });
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка авторизации через Google';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout API errors
    }
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false, error: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      // Silently fail
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.patch('/auth/me', profileData);
      set({ user: data, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Ошибка обновления профиля';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      if (!accessToken) {
        set({ isLoading: false });
        return;
      }
      const { data } = await api.get('/auth/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
