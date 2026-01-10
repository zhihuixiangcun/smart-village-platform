/**
 * API 响应类型定义
 */

// 基础响应结构
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 筛选参数
export interface FilterParams extends PaginationParams {
  search?: string;
  status?: string;
  villageId?: string;
  dateRange?: [string, string];
}

// 用户相关类型
export interface User {
  _id: string;
  username: string;
  phone: string;
  email?: string;
  role: UserRole;
  villageId?: Village;
  avatar?: string;
  isActive: boolean;
  isOnline: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'village_admin' | 'cadre' | 'resident' | 'volunteer';

export interface UserProfile extends User {
  realName?: string;
  idCard?: string;
  gender?: 'male' | 'female';
  birthDate?: string;
  address?: string;
}

// 村庄相关类型
export interface Village {
  _id: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  population?: number;
  householdCount?: number;
  adminId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// 村民相关类型
export interface Resident {
  _id: string;
  name: string;
  phone: string;
  idCard: string;
  gender: 'male' | 'female';
  birthDate: string;
  householdId?: Household;
  villageId: Village | string;
  status: 'active' | 'inactive' | 'deceased' | 'moved_out';
  specialIdentities?: string[];
  healthInfo?: HealthInfo;
  education?: string;
  occupation?: string;
  migrated?: boolean;
  migrantWork?: {
    location: string;
    employer: string;
    phone: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HealthInfo {
  bloodType?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  disability?: string;
  elderlyCare?: {
    isElderly: boolean;
    livingAlone: boolean;
    careLevel: 'self-care' | 'partial-care' | 'full-care';
  };
}

// 家庭相关类型
export interface Household {
  _id: string;
  codeId: string;
  householder: string;
  householderPhone: string;
  address: string;
  members: HouseholdMember[];
  memberCount: number;
  status: 'resident' | 'migrated' | 'vacant';
  tags: string[];
  villageId: Village | string;
  povertyLevel?: 'normal' | 'low-income' | 'poverty-alleviated';
  specialFamilyType?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  residentId: string;
  name: string;
  relationship: 'householder' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  isHouseholder: boolean;
}

// 公告相关类型
export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: 'normal' | 'high' | 'urgent';
  villageId: Village | string;
  authorId: User | string;
  targetAudience?: string[];
  attachments?: Attachment[];
  publishedAt?: string;
  expiresAt?: string;
  status: 'draft' | 'published' | 'archived';
  readCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementType = 'policy' | 'notice' | 'event' | 'emergency' | 'activity';

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// 任务相关类型
export interface Task {
  _id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: TaskStatus;
  villageId: Village | string;
  assigneeId?: User | string;
  creatorId: User | string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  comments?: TaskComment[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export type TaskType =
  | 'patrol'
  | 'inspection'
  | 'maintenance'
  | 'event'
  | 'emergency'
  | 'administration';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

export interface TaskComment {
  _id: string;
  userId: User | string;
  content: string;
  createdAt: string;
}

// 财务相关类型
export interface FinanceRecord {
  _id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  villageId: Village | string;
  operatorId: User | string;
  relatedProjectId?: string;
  receipts?: Attachment[];
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: User | string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceReport {
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: Record<string, number>;
  transactionCount: number;
}

// 一户一码相关类型
export interface HouseholdQRCode {
  householdId: string;
  codeId: string;
  qrCodeUrl: string;
  shortUrl?: string;
  expiresAt?: string;
  scanCount: number;
  lastScannedAt?: string;
}

// 邻里互助相关类型
export interface MutualAidRequest {
  _id: string;
  householdId: Household | string;
  type: MutualAidType;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  requiredHelpers: number;
  currentHelpers: number;
  helperIds: string[];
  scheduledTime?: string;
  completedAt?: string;
  responses?: MutualAidResponse[];
  createdAt: string;
  updatedAt: string;
}

export type MutualAidType =
  | 'life_help'
  | 'farm_work'
  | 'childcare'
  | 'elderly_care'
  | 'emergency'
  | 'other';

export interface MutualAidResponse {
  _id: string;
  requestId: string;
  helperId: User | string;
  status: 'accepted' | 'declined' | 'completed';
  message?: string;
  respondedAt: string;
}

// 通知相关类型
export interface Notification {
  _id: string;
  userId: User | string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type NotificationType = 'announcement' | 'task' | 'mutual_aid' | 'system' | 'reminder';

// 统计相关类型
export interface VillageStatistics {
  totalResidents: number;
  totalHouseholds: number;
  activeHouseholds: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  announcementsCount: number;
  mutualAidRequestsCount: number;
  completedAidCount: number;
  recentGrowth: {
    residents: number;
    households: number;
  };
}

// 表单相关类型
export interface LoginForm {
  username: string;
  password: string;
  captcha?: string;
  remember?: boolean;
}

export interface RegisterForm {
  phone: string;
  verifyCode: string;
  password: string;
  confirmPassword: string;
  realName: string;
  idCard: string;
  villageId: string;
  agreeTerms: boolean;
}

export interface AnnouncementForm {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: 'normal' | 'high' | 'urgent';
  targetAudience?: string[];
  expiresAt?: string;
  attachments?: File[];
}

export interface TaskForm {
  title: string;
  description: string;
  type: TaskType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  dueDate?: string;
}

// 错误码定义
export const ErrorCodes = {
  // 通用错误
  SUCCESS: '0000',
  UNKNOWN_ERROR: '9999',
  VALIDATION_ERROR: '1001',
  UNAUTHORIZED: '1002',
  FORBIDDEN: '1003',
  NOT_FOUND: '1004',

  // 认证错误
  INVALID_TOKEN: '2001',
  TOKEN_EXPIRED: '2002',
  INVALID_CREDENTIALS: '2003',
  ACCOUNT_DISABLED: '2004',

  // 数据错误
  DUPLICATE_ENTRY: '3001',
  DATA_NOT_FOUND: '3002',
  INVALID_DATA: '3003',

  // 系统错误
  DATABASE_ERROR: '4001',
  SERVER_ERROR: '4003',
  RATE_LIMIT_EXCEEDED: '4004',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
