/**
 * 全局类型声明
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_BASE_API: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK: string;
  readonly VITE_BUILD_GZIP: string;
  readonly VITE_GZIP_MIN_SIZE: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const ElMessage: any;
declare const router: any;

// 高德地图 AMap 全局类型声明
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: {
      securityJsCode: string;
    };
  }
}

export {};

// 商品相关类型
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: ProductCategory;
  images: string[];
  merchant: Merchant;
  distance: number;
  rating: number;
  reviewCount: number;
  stock: number;
  status: 'available' | 'sold_out' | 'reserved';
  tags: string[];
  publishTime: string;
  viewCount: number;
  likeCount: number;
}

export type ProductCategory = 'agricultural' | 'supplies' | 'daily' | 'food';

export interface Merchant {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  verified: boolean;
}

export type SortType = 'distance' | 'rating' | 'price_asc' | 'price_desc';
export type ViewMode = 'list' | 'map';

// 场所相关类型
export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  description: string;
  images: string[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance: number;
  rating: number;
  reviewCount: number;
  averagePrice?: number;
  address: string;
  phone?: string;
  businessHours?: string;
  isOpen: boolean;
  facilities?: string[];
  tags: string[];
}

export type VenueType = 'restaurant' | 'farm_stay' | 'scenic' | 'entertainment';

// 拼车相关类型
export interface Carpool {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar: string;
  driverRating: number;
  verified: boolean;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  licensePlate?: string;
  note?: string;
  status: 'active' | 'full' | 'completed' | 'cancelled';
  publishTime: string;
}

// 收藏相关类型
export interface Favorite {
  id: string;
  userId: string;
  targetType: 'product' | 'merchant' | 'venue';
  targetId: string;
  createdAt: string;
}

// 评价相关类型
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  targetType: 'product' | 'merchant' | 'venue' | 'carpool';
  targetId: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
  likes: number;
}

// 消息通知类型
export interface Notification {
  id: string;
  userId: string;
  type: 'carpool' | 'order' | 'review' | 'system';
  title: string;
  content: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

// 积分记录类型
export interface PointsRecord {
  id: string;
  userId: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  relatedId?: string;
  createdAt: string;
}
