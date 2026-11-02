export interface Product {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  image: string | null;
  condition: string | null;
  shipping: number | null;
  shippingCurrency: string | null;
  location: string | null;
  category: string | null;
  url: string | null;

  // AI recommendation
  score?: number;
  reason?: string;

  // Marketplace
  source?: string | null;
  platform?: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
  avatar_url?: string | null;
  created_at?: string;
  search_count?: number;
}

export interface SearchHistoryItem {
  id: number;
  user_id?: number | null;
  query_text: string;
  relationship?: string;
  gender?: string;
  age_range?: string;
  occasion?: string;
  budget?: string;
  interests?: string[];
  ai_summary?: string;
  ai_keywords?: string[];
  ai_items?: string[];
  products: Product[];
  total_products: number;
  created_at: string;
}

export interface FavoriteItem {
  id: number;
  user_id: number;
  product_name: string;
  product_price?: number | null;
  product_image?: string | null;
  product_url?: string | null;
  platform?: string | null;
  score?: number;
  created_at: string;
}

export interface TopGiftItem {
  product_name: string;
  price: number | null;
  image: string | null;
  url: string | null;
  platform: string;
  search_count: number;
  clicks: number;
  avg_score: number;
  last_seen: string;
}

export interface AdminOverviewStats {
  totalSearches: number;
  todaySearches: number;
  weekSearches: number;
  guestSearches: number;
  userSearches: number;
  totalUsers: number;
  newUsersWeek: number;
  totalProducts: number;
  totalImpressions: number;
  totalClicks: number;
}

export interface AdminChartDay {
  date: string;
  displayDate: string;
  total: number;
  user_count: number;
  guest_count: number;
}

export interface AdminAnalyticsData {
  topOccasions: Array<{ occasion: string; count: number }>;
  topRelationships: Array<{ relationship: string; count: number }>;
  topBudgets: Array<{ budget: string; count: number }>;
  topKeywords: Array<{ query_text: string; count: number }>;
}

export interface AdminSearchLog {
  id: number;
  user_id?: number | null;
  user_name: string;
  user_email?: string | null;
  query_text: string;
  relationship?: string;
  gender?: string;
  age_range?: string;
  occasion?: string;
  budget?: string;
  ai_summary?: string;
  total_products: number;
  created_at: string;
  previewProducts: Array<{ name: string; image?: string; price?: number }>;
}

export interface MemoryBoxReaction {
  id: number;
  from: string;
  text: string;
  created_at: string;
}

export interface MemoryBox {
  id: number;
  share_code: string;
  user_id?: number | null;
  title: string;
  occasion: string;
  sender_name: string;
  recipient_name: string;
  milestone_type: "countup" | "countdown" | "none";
  milestone_date?: string | null;
  letter_content: string;
  theme: "romantic" | "birthday" | "luxury" | "festive" | "emerald";
  product_name?: string | null;
  product_price?: number | null;
  product_image?: string | null;
  product_url?: string | null;
  unboxed_count: number;
  hearts_count: number;
  reactions?: MemoryBoxReaction[];
  created_at: string;
}

