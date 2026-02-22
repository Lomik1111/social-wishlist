import { create } from 'zustand';
import api from '../lib/api';

interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (type?: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (type) => {
    set({ isLoading: true });
    try {
      const params = type && type !== 'all' ? { type } : {};
      const { data } = await api.get('/notifications', { params });
      const unread = data.filter((n: Notification) => !n.is_read).length;
      set({ notifications: data, unreadCount: unread, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка загрузки', isLoading: false });
    }
  },

  markAllRead: async () => {
    try {
      await api.post('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка' });
    }
  },

  deleteNotification: async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: state.unreadCount - (state.notifications.find((n) => n.id === id && !n.is_read) ? 1 : 0),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка удаления' });
    }
  },

  clearError: () => set({ error: null }),
}));
