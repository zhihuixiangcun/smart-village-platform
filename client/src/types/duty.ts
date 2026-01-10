// 值班管理相关类型定义

export interface DutyPersonnel {
  id: string;
  name: string;
  position: string;
  phone: string;
  idCard: string;
  gender: 'male' | 'female';
  isActive: boolean;
  avatar?: string;
  availableShifts: ShiftType[];
  skills: string[];
  workAreas: string[];
  maxDutiesPerMonth: number;
  maxConsecutiveDays: number;
  preferredRestDays: string[];
  specialRequirements?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DutySchedule {
  id: string;
  date: string;
  shiftType: ShiftType;
  personnelId: string;
  personnelName: string;
  contactPhone: string;
  location: string;
  remark?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'absent';
  createdAt: Date;
  updatedAt: Date;
}

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DutyStatistics {
  totalDuties: number;
  completedDuties: number;
  upcomingDuties: number;
  personnelCount: number;
  workloadDistribution: WorkloadData[];
  monthlyStats: MonthlyStats[];
}

export interface WorkloadData {
  personnelId: string;
  personnelName: string;
  totalDuties: number;
  completedDuties: number;
  upcomingDuties: number;
  averageWorkload: number;
}

export interface MonthlyStats {
  month: string;
  totalDuties: number;
  completedDuties: number;
  attendanceRate: number;
}

export interface QuickScheduleData {
  type: 'single' | 'batch' | 'template';
  data: any;
}

export interface ScheduleTemplate {
  id: number;
  name: string;
  description: string;
  shifts: {
    [key in ShiftType]?: {
      enabled: boolean;
      personnelId?: string;
    };
  };
  weekdays: string[];
}

export interface SwapScheduleRequest {
  scheduleId1: string;
  scheduleId2: string;
}

export interface PersonnelRecommendation {
  personnelId: string;
  score: number;
  reasons: string[];
  recentDutyCount: number;
  lastDutyDate?: string;
}

export interface DutyCalendarDay {
  date: string;
  dayNumber: number;
  isToday: boolean;
  schedules: DutySchedule[];
}

// API 响应类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 表单验证相关
export interface DutyPersonnelFormData {
  name: string;
  position: string;
  phone: string;
  idCard: string;
  gender: 'male' | 'female';
  isActive: boolean;
  avatar?: string;
  availableShifts: ShiftType[];
  skills: string[];
  workAreas: string[];
  maxDutiesPerMonth: number;
  maxConsecutiveDays: number;
  preferredRestDays: string[];
  specialRequirements?: string;
}

// 排班偏好配置
export interface SchedulingPreference {
  preferSameShift: boolean;
  avoidConsecutiveDays: boolean;
  balanceWorkload: boolean;
  considerSkills: boolean;
  considerWorkAreas: boolean;
}

// 班次时间配置
export const SHIFT_TIME_CONFIG = {
  morning: { name: '早班', start: '06:00', end: '12:00', color: '#67c23a' },
  afternoon: { name: '午班', start: '12:00', end: '18:00', color: '#e6a23c' },
  evening: { name: '晚班', start: '18:00', end: '24:00', color: '#f56c6c' },
  night: { name: '夜班', start: '00:00', end: '06:00', color: '#909399' },
};

// 技能选项
export const SKILL_OPTIONS = [
  { value: 'emergency', label: '应急处置' },
  { value: 'medical', label: '医疗救护' },
  { value: 'firefighting', label: '消防安全' },
  { value: 'maintenance', label: '设备维护' },
  { value: 'communication', label: '通讯联络' },
  { value: 'traffic', label: '交通疏导' },
  { value: 'comfort', label: '群众安抚' },
  { value: 'recording', label: '信息记录' },
];

// 工作区域选项
export const WORK_AREA_OPTIONS = [
  { value: 'office', label: '村委会办公室' },
  { value: 'service_center', label: '村民服务中心' },
  { value: 'cultural_square', label: '文化活动广场' },
  { value: 'clinic', label: '村卫生室' },
  { value: 'senior_center', label: '老年活动中心' },
  { value: 'kindergarten', label: '村幼儿园' },
  { value: 'main_roads', label: '村内主要道路' },
  { value: 'entire_village', label: '全村范围' },
];
