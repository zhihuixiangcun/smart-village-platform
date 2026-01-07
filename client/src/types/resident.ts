/**
 * 村民相关类型定义
 */

/**
 * 个人基本信息
 */
export interface PersonalInfo {
  name: string
  photo?: string
  age?: number
  gender?: 'male' | 'female'
  idCard?: string
  phone?: string
  address?: string
  birthday?: string
  ethnicity?: string
  education?: string
  maritalStatus?: string
}

/**
 * 联系信息
 */
export interface ContactInfo {
  phone?: string
  address?: string
  email?: string
  emergencyContact?: string
  emergencyPhone?: string
}

/**
 * 家庭成员
 */
export interface FamilyMember {
  id: string
  name: string
  relation: string
  avatar?: string
  isSelf?: boolean
  tags?: string[]
  healthStatus?: string
  age?: number
  phone?: string
  idCard?: string
}

/**
 * 补贴信息
 */
export interface SubsidyInfo {
  id: string
  name: string
  type: 'elderly' | 'medical' | 'subsistence' | 'disability'
  amount?: string
  status: 'available' | 'pending' | 'applied' | 'approved'
  badge?: string
  badgeType?: 'success' | 'warning' | 'danger' | 'info'
  route?: string
}

/**
 * 政策公告
 */
export interface Announcement {
  id: string
  title: string
  summary: string
  type: 'policy' | 'notice' | 'urgent' | 'info'
  content: string
  publishTime: string
  viewCount: number
  isNew?: boolean
  dialectContent?: string
}

/**
 * 服务项目
 */
export interface ServiceItem {
  id: string
  name: string
  type: string
  icon: any
  route?: string
  status?: string
  statusType?: 'success' | 'warning' | 'danger' | 'info'
  pending?: number
}

/**
 * 村民档案
 */
export interface ResidentProfile {
  id: string
  personalInfo: PersonalInfo
  contact?: ContactInfo
  tags?: string[]
  householdCode?: string
  villageId?: string
  familyMembers?: FamilyMember[]
  subsidies?: SubsidyInfo[]
  createdAt?: string
  updatedAt?: string
}

/**
 * 紧急联系人
 */
export interface EmergencyContact {
  id: string
  name: string
  phone: string
  role: string
  priority: number
}

/**
 * 字体大小配置
 */
export interface FontSizeConfig {
  level: 'small' | 'normal' | 'large' | 'extra-large' | 'huge'
  customScale: number
}

/**
 * 家庭档案
 */
export interface HouseholdProfile {
  id: string
  householdCode: string
  householder: string
  address: string
  memberCount: number
  type?: '普通家庭' | '低保家庭' | '独居老人户' | '残疾人家庭' | '党员家庭'
  members: FamilyMember[]
  qrcodeUrl?: string
  certified?: boolean
}
