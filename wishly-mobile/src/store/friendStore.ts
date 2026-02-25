import { create } from 'zustand';
import type { AxiosError } from 'axios';
import api from '../lib/api';
import type { UserPublic, Friendship, FriendRequest } from '../types';

interface FriendState {
  friends: Friendship[];
  requests: FriendRequest[];
  searchResults: UserPublic[];
  isLoading: boolean;
  error: string | null;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
}

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  requests: [],
  searchResults: [],
  isLoading: false,
  error: null,

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/friends');
      set({ friends: data, isLoading: false });
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      set({ error: axiosError.response?.data?.detail || 'Ошибка загрузки', isLoading: false });
    }
  },

  fetchRequests: async () => {
    try {
      const { data } = await api.get('/friends/requests');
      set({ requests: data });
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      set({ error: axiosError.response?.data?.detail || 'Ошибка загрузки' });
    }
  },

  searchUsers: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    try {
      const { data } = await api.get('/users/search', { params: { q: query } });
      set({ searchResults: data });
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      set({ error: axiosError.response?.data?.detail || 'Ошибка поиска' });
    }
  },

  sendRequest: async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      set({ error: axiosError.response?.data?.detail || 'Ошибка отправки запроса' });
      throw err;
    }
  },

  acceptRequest: async (userId) => {
    try {
      await api.post(`/friends/accept/${userId}`);
      set((state) => ({
        requests: state.requests.filter((r) => r.requester.id !== userId),
      }));
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      set({ error: axiosError.response?.data?.detail || 'Ошибка принятия запроса' });
      throw err;
    }
  },

  removeFriend: async (userId) => {
    try {
      await api.delete(`/friends/${userId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f.user.id !== userId),
      }));
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      set({ error: axiosError.response?.data?.detail || 'Ошибка удаления' });
      throw err;
    }
  },

  clearSearch: () => set({ searchResults: [] }),
  clearError: () => set({ error: null }),
}));
