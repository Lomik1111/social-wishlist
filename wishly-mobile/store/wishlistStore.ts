import { create } from 'zustand';
import api from '../lib/api';

interface Wishlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  event_date: string | null;
  share_token: string;
  is_active: boolean;
  theme: string;
  cover_image_url: string | null;
  privacy: string;
  show_prices: boolean;
  anonymous_reservations: boolean;
  notifications_enabled: boolean;
  item_count: number;
  reserved_count: number;
  created_at: string;
}

interface Item {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  source_domain: string | null;
  is_group_gift: boolean;
  priority: string;
  sort_order: number;
  is_liked_by_owner: boolean;
  like_count: number;
  is_reserved: boolean;
  reservation_count: number;
  contribution_total: number;
  contribution_count: number;
  progress_percentage: number;
  created_at: string;
}

interface WishlistState {
  wishlists: Wishlist[];
  currentWishlist: Wishlist | null;
  currentItems: Item[];
  friendsWishlists: any[];
  isLoading: boolean;
  error: string | null;

  fetchWishlists: () => Promise<void>;
  fetchWishlistById: (id: string) => Promise<void>;
  fetchWishlistItems: (wishlistId: string) => Promise<void>;
  createWishlist: (data: { title: string; description?: string; occasion?: string; event_date?: string; theme?: string; privacy?: string }) => Promise<Wishlist>;
  updateWishlist: (id: string, data: Partial<Wishlist>) => Promise<void>;
  deleteWishlist: (id: string) => Promise<void>;
  addItem: (wishlistId: string, data: { name: string; description?: string; url?: string; image_url?: string; price?: number; currency?: string; source_domain?: string; is_group_gift?: boolean; priority?: string }) => Promise<Item>;
  updateItem: (itemId: string, data: Partial<Item>) => Promise<void>;
  deleteItem: (wishlistId: string, itemId: string) => Promise<void>;
  fetchFriendsWishlists: () => Promise<void>;
  clearError: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlists: [],
  currentWishlist: null,
  currentItems: [],
  friendsWishlists: [],
  isLoading: false,
  error: null,

  fetchWishlists: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/wishlists');
      set({ wishlists: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка загрузки', isLoading: false });
    }
  },

  fetchWishlistById: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/wishlists/${id}`);
      set({ currentWishlist: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка загрузки', isLoading: false });
    }
  },

  fetchWishlistItems: async (wishlistId) => {
    try {
      const { data } = await api.get(`/wishlists/${wishlistId}/items`);
      set({ currentItems: data });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка загрузки' });
    }
  },

  createWishlist: async (createData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/wishlists', createData);
      set((state) => ({ wishlists: [data, ...state.wishlists], isLoading: false }));
      return data;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка создания', isLoading: false });
      throw err;
    }
  },

  updateWishlist: async (id, updateData) => {
    try {
      const { data } = await api.patch(`/wishlists/${id}`, updateData);
      set((state) => ({
        wishlists: state.wishlists.map((w) => (w.id === id ? data : w)),
        currentWishlist: state.currentWishlist?.id === id ? data : state.currentWishlist,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка обновления' });
    }
  },

  deleteWishlist: async (id) => {
    try {
      await api.delete(`/wishlists/${id}`);
      set((state) => ({
        wishlists: state.wishlists.filter((w) => w.id !== id),
        currentWishlist: state.currentWishlist?.id === id ? null : state.currentWishlist,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка удаления' });
    }
  },

  addItem: async (wishlistId, itemData) => {
    try {
      const { data } = await api.post(`/wishlists/${wishlistId}/items`, itemData);
      set((state) => ({ currentItems: [...state.currentItems, data] }));
      return data;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка добавления' });
      throw err;
    }
  },

  updateItem: async (itemId, updateData) => {
    try {
      const { data } = await api.patch(`/items/${itemId}`, updateData);
      set((state) => ({
        currentItems: state.currentItems.map((i) => (i.id === itemId ? data : i)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка обновления' });
    }
  },

  deleteItem: async (wishlistId, itemId) => {
    try {
      await api.delete(`/wishlists/${wishlistId}/items/${itemId}`);
      set((state) => ({
        currentItems: state.currentItems.filter((i) => i.id !== itemId),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка удаления' });
    }
  },

  fetchFriendsWishlists: async () => {
    try {
      const { data } = await api.get('/wishlists/friends');
      set({ friendsWishlists: data });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Ошибка загрузки' });
    }
  },

  clearError: () => set({ error: null }),
}));
