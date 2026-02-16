export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Wishlist {
  id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  event_date: string | null;
  share_token: string;
  is_active: boolean;
  theme: string;
  item_count: number;
  created_at: string;
}

export interface WishlistPublic {
  id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  event_date: string | null;
  owner_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: string | null;
  is_group_gift: boolean;
  priority: string;
  sort_order: number;
  created_at: string;
}

export interface ItemPublic {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: string | null;
  is_group_gift: boolean;
  priority: string;
  is_reserved: boolean;
  contribution_total: string;
  contribution_count: number;
  progress_percentage: number;
}

export interface ItemOwner extends Item {
  is_reserved: boolean;
  reservation_count: number;
  contribution_total: string;
  contribution_count: number;
  progress_percentage: number;
}

export interface AutoFillResult {
  title: string | null;
  description: string | null;
  image_url: string | null;
  price: number | null;
  success: boolean;
}
