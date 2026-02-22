export interface User {
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

export interface UserPublic {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_premium: boolean;
  is_online: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Wishlist {
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
  privacy: 'public' | 'friends' | 'selected' | 'private';
  show_prices: boolean;
  anonymous_reservations: boolean;
  notifications_enabled: boolean;
  item_count: number;
  reserved_count: number;
  created_at: string;
}

export interface WishlistPublic {
  id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  event_date: string | null;
  owner_name: string | null;
  owner_username: string | null;
  owner_avatar: string | null;
  is_active: boolean;
  theme: string;
  cover_image_url: string | null;
  show_prices: boolean;
  item_count: number;
  reserved_count: number;
  created_at: string;
}

export interface Item {
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
  priority: 'must_have' | 'nice_to_have' | 'dream' | 'normal';
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

export interface ItemPublic {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  source_domain: string | null;
  is_group_gift: boolean;
  priority: string;
  is_reserved: boolean;
  reserver_name: string | null;
  contribution_total: number;
  contribution_count: number;
  progress_percentage: number;
}

export interface Reservation {
  id: string;
  item_id: string;
  reserver_id: string | null;
  guest_name: string | null;
  is_anonymous: boolean;
  is_purchased: boolean;
  purchased_at: string | null;
  thanks_sent: boolean;
  thanks_reaction: string | null;
  thanks_message: string | null;
  created_at: string;
  item_name: string | null;
  item_image_url: string | null;
  item_price: number | null;
  wishlist_title: string | null;
  wishlist_owner_name: string | null;
}

export interface Friendship {
  id: string;
  user: UserPublic;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface FriendRequest {
  id: string;
  requester: UserPublic;
  created_at: string;
}

export interface Notification {
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

export interface UserStats {
  total_gifts: number;
  reserved_count: number;
  top_category: string | null;
  avg_price: number;
  monthly_activity: { month: string; count: number }[];
  top_givers: { user_id: string; name: string; avatar_url: string | null; count: number }[];
}

export interface AutofillResult {
  success: boolean;
  title: string | null;
  description: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  source_domain: string | null;
  error: string | null;
}

export interface WishlistTheme {
  id: string;
  name: string;
  description: string;
  gradient: readonly [string, string];
  accent: string;
  icon: string;
}
