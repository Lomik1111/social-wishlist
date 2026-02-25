import { create } from 'zustand';
import { SecureStorage } from '../lib/secureStorage';
import api from '../lib/api';
import { useWishlistStore } from './wishlistStore';
import { useFriendStore } from './friendStore';
import { useNotificationStore } from './notificationStore';

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
  biometrics_enabled: boolean;
  has_google: boolean;
  has_apple: boolean;
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
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
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
      await SecureStorage.setItem('access_token', data.access_token);
      await SecureStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка входа';
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
      await SecureStorage.setItem('access_token', data.access_token);
      await SecureStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка регистрации';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  loginWithGoogle: async (credential) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/google', { credential });
      await SecureStorage.setItem('access_token', data.access_token);
      await SecureStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка авторизации через Google';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/forgot-password', { email });
      set({ isLoading: false });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка отправки кода';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  resetPassword: async (email, code, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/reset-password', { email, code, new_password: newPassword });
      set({ isLoading: false });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка сброса пароля';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors — tokens will be cleared locally regardless
    }
    await SecureStorage.deleteItem('access_token');
    await SecureStorage.deleteItem('refresh_token');

    // Reset other stores
    useWishlistStore.setState({
      wishlists: [],
      currentWishlist: null,
      currentItems: [],
      friendsWishlists: [],
      isLoading: false,
      error: null,
    });
    useFriendStore.setState({
      friends: [],
      requests: [],
      searchResults: [],
      isLoading: false,
      error: null,
    });
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });

    set({ user: null, isAuthenticated: false, error: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError;
      if (axiosError.code === 'ERR_NETWORK') {
        set({ error: 'Нет подключения к интернету' });
      }
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.patch('/auth/me', profileData);
      set({ user: data, isLoading: false });
    } catch (err) {
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка обновления профиля';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await SecureStorage.getItem('access_token');
      if (!accessToken) {
        set({ isLoading: false });
        return;
      }
      const { data } = await api.get('/auth/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStorage.deleteItem('access_token');
      await SecureStorage.deleteItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
