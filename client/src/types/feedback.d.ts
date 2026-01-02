/**
 * 用户反馈系统 TypeScript 类型定义
 */

export enum FeedbackCategory {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  IMPROVEMENT = 'improvement',
  COMPLAINT = 'complaint',
  COMPLIMENT = 'compliment',
  QUESTION = 'question',
  USAGE_DIFFICULTY = 'usage_difficulty'
}

export enum FeedbackSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum FeedbackStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected'
}

export interface FeedbackAttachment {
  type: 'image' | 'video' | 'file' | 'screenshot'
  url: string
  filename: string
  size: number
  description?: string
}

export interface FeedbackContext {
  page: string
  action: string
  userAgent: string
  deviceInfo: Record<string, any>
  browserInfo: Record<string, any>
  location: Record<string, any> | null
  timestamp: Date
  sessionId: string
}

export interface AICategory {
  mainCategory: string
  subCategory: string
  confidence: number
  keywords: string[]
}

export interface FeedbackResponse {
  responderId: string
  response: string
  attachments: Array<{ url: string; filename: string }>
  timestamp: Date
  isInternal: boolean
}

export interface FeedbackSatisfaction {
  rating: number
  comment?: string
  timestamp: Date
}

export interface BaseFeedback {
  feedbackId: string
  userId: string
  userType: 'villager' | 'admin' | 'staff' | 'guest'
  category: FeedbackCategory
  title: string
  description: string
  attachments: FeedbackAttachment[]
  context: FeedbackContext
  severity: FeedbackSeverity
  priority: FeedbackPriority
  status: FeedbackStatus
  tags: string[]
  aiCategory: AICategory
  createdAt: Date
  updatedAt: Date
}

export interface FeedbackWithProcessing extends BaseFeedback {
  assignedTo?: string
  assignedTeam?: 'dev' | 'product' | 'support' | 'ui' | 'security'
  responses: FeedbackResponse[]
  satisfaction?: FeedbackSatisfaction
  resolvedAt?: Date
  responseTime?: number
  resolutionTime?: number
}

export interface FeedbackForm {
  category: FeedbackCategory
  title: string
  description: string
  severity: FeedbackSeverity
  priority: FeedbackPriority
  tags: string[]
  contact?: string
  attachments: Array<{
    name: string
    file: File
    size: number
    type: string
  }>
}

export interface FeedbackFilters {
  userId?: string
  category?: FeedbackCategory
  status?: FeedbackStatus
  priority?: FeedbackPriority
  assignedTeam?: string
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
  page?: number
  limit?: number
}

export interface FeedbackListResponse {
  feedbacks: FeedbackWithProcessing[]
  pagination: {
    current: number
    pageSize: number
    total: number
    pages: number
  }
}

export interface FeedbackStats {
  overview: {
    total: number
    pending: number
    inProgress: number
    resolved: number
    resolutionRate: string
    avgResolutionTime: number
  }
  category: Array<{
    _id: string
    count: number
    avgRating?: number
  }>
  severity: Array<{
    _id: string
    count: number
  }>
  team: Array<{
    _id: string
    count: number
    avgResolutionTime?: number
  }>
  satisfaction: {
    avgRating: number
    totalRatings: number
    distribution: Record<string, number>
  }
  trends: Array<{
    date: string
    count: number
  }>
}

export interface ProcessData {
  status?: FeedbackStatus
  assignedTo?: string
  assignedTeam?: string
  response: string
  isInternal?: boolean
  tags?: string[]
}

export interface SatisfactionData {
  rating: number
  comment?: string
}

export interface BatchProcessData {
  feedbackIds: string[]
  processAction: 'assign' | 'update_status'
  processData: ProcessData
}

export interface BatchProcessResult {
  processed: number
  failed: number
  results: Array<{
    feedbackId: string
    success: boolean
    error?: string
  }>
}

export interface CategoryOption {
  value: FeedbackCategory
  label: string
  description: string
}

export interface QuickFilter {
  key: string
  label: string
}

export interface ActionSheetAction {
  name: string
  icon: string
}

export interface ProcessedResponse {
  success: boolean
  data: FeedbackWithProcessing
}

export interface SubmitResponse {
  success: boolean
  data: {
    feedbackId: string
    status: FeedbackStatus
    estimatedResponseTime: string
  }
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel'
  dateRange?: {
    start: string
    end: string
  }
  categories?: string[]
  status?: string[]
  includeAttachments?: boolean
  exportedBy: string
}

export interface ExportResult {
  success: boolean
  data: {
    content: string | ArrayBuffer
    filename: string
    mimeType: string
  }
}

// 错误类型定义
export interface FeedbackError {
  success: false
  message: string
  error: string
}

// API响应类型
export type ApiResponse<T = any> = T | FeedbackError

// 组件Props类型
export interface FeedbackSubmissionProps {
  userId?: string
  preselectedCategory?: FeedbackCategory
  readonly?: boolean
}

export interface FeedbackManagementProps {
  filters?: FeedbackFilters
  showActions?: boolean
  allowBatchProcess?: boolean
}

export interface FeedbackDetailProps {
  feedbackId: string
  allowEdit?: boolean
  showResponses?: boolean
}

// 事件类型
export interface FeedbackSubmitEvent {
  feedbackId: string
  category: FeedbackCategory
}

export interface FeedbackProcessEvent {
  feedbackId: string
  oldStatus: FeedbackStatus
  newStatus: FeedbackStatus
}

// 表单验证规则类型
export interface FeedbackFormRules {
  category: Array<{
    required: boolean
    message: string
    trigger: string
  }>
  title: Array<{
    required: boolean
    message: string
    trigger: string | string[]
    min?: number
    max?: number
  }>
  description: Array<{
    required: boolean
    message: string
    trigger: string | string[]
    min?: number
    max?: number
  }>
}