/**
 * 市集和位置服务相关类型定义
 */

/**
 * 地理位置
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  province?: string;
}

/**
 * 商品/商家
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: 'agricultural' | 'supplies' | 'daily' | 'food';
  images: string[];
  merchant: Merchant;
  distance?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  status: 'available' | 'sold_out' | 'reserved';
  tags?: string[];
  publishTime: string;
  viewCount: number;
  likeCount: number;
}

/**
 * 商家信息
 */
export interface Merchant {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  address: string;
  location: GeoLocation;
  rating: number;
  reviewCount: number;
  businessHours?: string;
  isOpen: boolean;
  verified: boolean;
}

/**
 * 餐厅/娱乐场所
 */
export interface Venue {
  id: string;
  name: string;
  type: 'restaurant' | 'farm_stay' | 'scenic' | 'entertainment';
  description: string;
  images: string[];
  location: GeoLocation;
  distance: number;
  rating: number;
  reviewCount: number;
  averagePrice: number;
  address: string;
  phone?: string;
  businessHours: string;
  isOpen: boolean;
  facilities?: string[];
  tags?: string[];
}

/**
 * 交通信息
 */
export interface FlightInfo {
  id: string;
  airportCode: string;
  airportName: string;
  distance: number;
  city: string;
  travelTime: string;
  transportMethods: string[];
}

export interface TrainStation {
  id: string;
  stationName: string;
  stationCode: string;
  distance: number;
  address: string;
  transportMethods: string[];
}

/**
 * 拼车信息
 */
export interface Carpool {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverRating: number;
  verified: boolean;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  licensePlate: string;
  note?: string;
  status: 'active' | 'full' | 'completed' | 'cancelled';
  publishTime: string;
}

/**
 * 发布商品表单
 */
export interface PublishProductForm {
  name: string;
  description: string;
  price: number;
  unit: string;
  category: 'agricultural' | 'supplies' | 'daily' | 'food';
  images: File[] | string[];
  stock?: number;
  tags?: string[];
}

/**
 * 商品分类
 */
export type ProductCategory = 'agricultural' | 'supplies' | 'daily' | 'food';

/**
 * 场所分类
 */
export type VenueType = 'restaurant' | 'farm_stay' | 'scenic' | 'entertainment';

/**
 * 视图模式
 */
export type ViewMode = 'list' | 'map';

/**
 * 排序方式
 */
export type SortType = 'distance' | 'rating' | 'price_asc' | 'price_desc';

/**
 * 招聘信息
 */
export interface JobPosting {
  id: string;
  title: string;
  company: string;
  companyType: 'farm' | 'factory' | 'construction' | 'service' | 'other';
  location: string;
  distance?: number;
  position: string;
  salaryMin: number;
  salaryMax: number;
  salaryUnit: 'hour' | 'day' | 'month' | 'year' | 'project';
  salaryType: 'negotiable' | 'fixed';
  description: string;
  requirements: string[];
  benefits?: string[];
  contactPerson: string;
  contactPhone: string;
  wechat?: string;
  workerCount: number;
  urgent: boolean;
  status: 'active' | 'closed' | 'filled';
  publishTime: string;
  viewCount: number;
  tags?: string[];
}

/**
 * 求职信息
 */
export interface JobSeeker {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  phone: string;
  wechat?: string;
  skills: string[];
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  expectedSalaryUnit: 'hour' | 'day' | 'month';
  availableDate: string;
  experience?: string;
  location: string;
  avatar?: string;
  verified: boolean;
  status: 'seeking' | 'employed';
  publishTime: string;
}
