import type { AxiosRequestConfig, AxiosResponse } from 'axios';

// 通用 API 响应格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 村民相关类型
export interface Resident {
  id: number;
  name: string;
  gender: string;
  idCard: string;
  phone: string;
  address: string;
  householdCode: string;
  householdType: string;
  relation: string;
  education: string;
  isLowIncome: boolean;
  isDisabled: boolean;
  isElderlyLivingAlone: boolean;
  hasInsurance: boolean;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResidentDto extends Omit<Resident, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UpdateResidentDto extends Partial<
  Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>
> {}

export interface GetResidentsParams extends PaginationParams {
  keyword?: string;
  householdType?: string;
  ageGroup?: string;
  education?: string;
}

// 公告相关类型
export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'published' | 'archived';
  publishTime: string;
  readCount: number;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto extends Omit<
  Announcement,
  'id' | 'readCount' | 'createdAt' | 'updatedAt'
> {}
export interface UpdateAnnouncementDto extends Partial<
  Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>
> {}

// 任务相关类型
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignee: string;
  assigneeId: string;
  deadline: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto extends Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}
export interface UpdateTaskDto extends Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> {}

// 户码相关类型
export interface Household {
  codeId: string;
  householder: string;
  address: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  gender: string;
  idCard: string;
}

// 仪表板统计类型
export interface DashboardStats {
  totalResidents: number;
  residentsTrend: 'up' | 'down' | 'stable';
  residentsChange: string;
  todayTasks: number;
  tasksTrend: 'up' | 'down' | 'stable';
  tasksChange: string;
  emergencies: number;
  emergenciesTrend: 'up' | 'down' | 'stable';
  emergenciesChange: string;
  newAnnouncements: number;
}

// API 配置
export interface ApiConfig extends AxiosRequestConfig {
  baseURL?: string;
  timeout?: number;
}

// 请求拦截器类型
export interface RequestInterceptor {
  onFulfilled?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>;
  onRejected?: (error: unknown) => unknown;
}

// 响应拦截器类型
export interface ResponseInterceptor {
  onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  onRejected?: (error: unknown) => unknown;
}
