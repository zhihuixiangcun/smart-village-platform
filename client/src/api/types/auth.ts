/**
 * 认证相关API类型定义
 * Authentication API Type Definitions
 */

// ========== 基础类型 ==========

/**
 * API响应基础结构
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  timestamp?: number;
}

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'admin',              // 系统管理员
  VILLAGE_ADMIN = 'village_admin',  // 村委会成员
  VILLAGE_OFFICIAL = 'village_official',  // 村务官员
  RESIDENT = 'resident',        // 村民
  GUEST = 'guest',              // 访客
}

/**
 * 用户权限枚举
 */
export enum UserPermission {
  // 系统管理
  ADMIN_ACCESS = 'admin:access',
  USER_MANAGE = 'user:manage',
  ROLE_MANAGE = 'role:manage',
  PERMISSION_MANAGE = 'permission:manage',

  // 村务管理
  VILLAGE_READ = 'village:read',
  VILLAGE_WRITE = 'village:write',
  VILLAGE_ADMIN = 'village:admin',
  VILLAGE_DELETE = 'village:delete',

  // 村民管理
  RESIDENT_READ = 'resident:read',
  RESIDENT_WRITE = 'resident:write',
  RESIDENT_DELETE = 'resident:delete',

  // 财务管理
  FINANCE_READ = 'finance:read',
  FINANCE_WRITE = 'finance:write',
  FINANCE_APPROVE = 'finance:approve',
  FINANCE_REPORT = 'finance:report',

  // 生活服务
  SERVICE_READ = 'service:read',
  SERVICE_WRITE = 'service:write',

  // 数据统计
  DASHBOARD_VIEW = 'dashboard:view',
  STATISTICS_READ = 'statistics:read',

  // 超级管理员权限
  ALL = '*',
}

// ========== 用户相关类型 ==========

/**
 * 用户基本信息
 */
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  permissions: UserPermission[];
  villageId?: string;
  villageName?: string;
  department?: string;
  position?: string;
  status: 'active' | 'disabled' | 'pending';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * 登录用户数据（包含token）
 */
export interface AuthUser extends UserInfo {
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

// ========== 登录相关类型 ==========

/**
 * 账号密码登录请求
 */
export interface LoginByPasswordRequest {
  username: string;
  password: string;
  role?: UserRole;
  rememberMe?: boolean;
}

/**
 * 手机验证码登录请求
 */
export interface LoginByCodeRequest {
  phone: string;
  code: string;
  role?: UserRole;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: AuthUser;
  redirectUrl?: string;
}

// ========== 注册相关类型 ==========

/**
 * 用户注册请求
 */
export interface RegisterRequest {
  name: string;
  phone: string;
  idCard: string;
  password: string;
  villageId: string;
  role?: UserRole;
  idCardFront?: string;  // 身份证正面照片
  idCardBack?: string;   // 身份证反面照片
  avatar?: string;       // 头像
}

/**
 * 注册响应
 */
export interface RegisterResponse {
  user: UserInfo;
  requireAudit?: boolean;  // 是否需要审核
  message?: string;
}

// ========== 验证码相关类型 ==========

/**
 * 发送验证码请求
 */
export interface SendCodeRequest {
  phone: string;
  type: 'login' | 'register' | 'reset_password' | 'verify';
}

/**
 * 验证验证码请求
 */
export interface VerifyCodeRequest {
  phone: string;
  code: string;
  type: 'login' | 'register' | 'reset_password';
}

/**
 * 验证码响应
 */
export interface VerifyCodeResponse {
  valid: boolean;
  message?: string;
}

// ========== 密码相关类型 ==========

/**
 * 忘记密码请求
 */
export interface ForgotPasswordRequest {
  account: string;  // 用户名或手机号
  verifyCode: string;
}

/**
 * 重置密码请求
 */
export interface ResetPasswordRequest {
  account: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// ========== 人脸识别相关类型 ==========

/**
 * 人脸特征数据
 */
export interface FaceFeature {
  feature: number[];  // 人脸特征向量
  image: string;      // base64图像数据
  quality: number;    // 图像质量分数
}

/**
 * 人脸注册请求
 */
export interface FaceRegisterRequest {
  userId: string;
  faceData: FaceFeature;
  image: string;
}

/**
 * 人脸验证请求
 */
export interface FaceVerifyRequest {
  faceData: FaceFeature;
  image: string;
}

/**
 * 人脸验证响应
 */
export interface FaceVerifyResponse {
  matched: boolean;
  user?: UserInfo;
  similarity?: number;
  confidence?: number;
}

// ========== 用户资料相关类型 ==========

/**
 * 更新用户资料请求
 */
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  department?: string;
  position?: string;
}

// ========== 村庄相关类型 ==========

/**
 * 村庄信息
 */
export interface VillageInfo {
  id: string;
  name: string;
  code: string;
  township?: string;
  district?: string;
  city?: string;
  province?: string;
  address?: string;
  population?: number;
  households?: number;
  area?: number;
  status: 'active' | 'inactive';
}

/**
 * 获取村庄列表请求
 */
export interface GetVillagesRequest {
  keyword?: string;
  district?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 获取村庄列表响应
 */
export interface GetVillagesResponse {
  list: VillageInfo[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== 第三方登录相关类型 ==========

/**
 * 第三方登录类型
 */
export enum ThirdPartyLoginType {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  QQ = 'qq',
  DINGTALK = 'dingtalk',
}

/**
 * 第三方登录请求
 */
export interface ThirdPartyLoginRequest {
  type: ThirdPartyLoginType;
  code: string;
  state?: string;
}

/**
 * 第三方登录响应
 */
export interface ThirdPartyLoginResponse {
  user: AuthUser;
  needBindPhone?: boolean;  // 是否需要绑定手机号
  needRegister?: boolean;   // 是否需要完善信息
}

// ========== 双因素认证相关类型 ==========

/**
 * 2FA设置请求
 */
export interface Setup2FARequest {
  method: 'totp' | 'sms' | 'email';
  secret?: string;  // TOTP密钥
}

/**
 * 2FA验证请求
 */
export interface Verify2FARequest {
  code: string;
  method: 'totp' | 'sms' | 'email';
}

/**
 * 2FA设置响应
 */
export interface Setup2FAResponse {
  qrCode?: string;    // TOTP二维码
  secret?: string;    // TOTP密钥
  backupCodes?: string[];  // 备用码
}

// ========== 错误码定义 ==========

/**
 * 认证错误码
 */
export enum AuthErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'AUTH_000',
  INVALID_REQUEST = 'AUTH_001',
  UNAUTHORIZED = 'AUTH_002',
  FORBIDDEN = 'AUTH_003',
  TOKEN_EXPIRED = 'AUTH_004',
  TOKEN_INVALID = 'AUTH_005',

  // 登录错误
  LOGIN_FAILED = 'AUTH_100',
  USER_NOT_FOUND = 'AUTH_101',
  INVALID_PASSWORD = 'AUTH_102',
  USER_DISABLED = 'AUTH_103',
  ACCOUNT_LOCKED = 'AUTH_104',

  // 注册错误
  REGISTER_FAILED = 'AUTH_200',
  USER_EXISTS = 'AUTH_201',
  PHONE_EXISTS = 'AUTH_202',
  INVALID_ID_CARD = 'AUTH_203',
  INVALID_PHONE = 'AUTH_204',

  // 验证码错误
  CODE_SEND_FAILED = 'AUTH_300',
  CODE_INVALID = 'AUTH_301',
  CODE_EXPIRED = 'AUTH_302',
  CODE_TOO_MANY = 'AUTH_303',

  // 密码错误
  PASSWORD_WEAK = 'AUTH_400',
  PASSWORD_SAME = 'AUTH_401',
  PASSWORD_RESET_FAILED = 'AUTH_402',

  // 人脸识别错误
  FACE_NOT_FOUND = 'AUTH_500',
 _FACE_MATCH_FAILED = 'AUTH_501',
  FACE_QUALITY_LOW = 'AUTH_502',
  FACE_REGISTER_FAILED = 'AUTH_503',

  // 2FA错误
  TFA_SETUP_FAILED = 'AUTH_600',
  TFA_VERIFY_FAILED = 'AUTH_601',
  TFA_REQUIRED = 'AUTH_602',
}

// ========== API方法签名 ==========

/**
 * 认证API接口
 */
export interface AuthApi {
  // 登录
  loginByPassword(data: LoginByPasswordRequest): Promise<ApiResponse<LoginResponse>>;
  loginByCode(data: LoginByCodeRequest): Promise<ApiResponse<LoginResponse>>;
  loginByThirdParty(data: ThirdPartyLoginRequest): Promise<ApiResponse<ThirdPartyLoginResponse>>;
  loginByFace(data: FaceVerifyRequest): Promise<ApiResponse<LoginResponse>>;

  // 注册
  register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>>;

  // 登出
  logout(): Promise<ApiResponse<void>>;

  // Token刷新
  refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string; user: AuthUser }>>;

  // 用户信息
  getProfile(): Promise<ApiResponse<UserInfo>>;
  updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserInfo>>;

  // 密码
  changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>>;
  forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<void>>;
  resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<void>>;

  // 验证码
  sendCode(data: SendCodeRequest): Promise<ApiResponse<void>>;
  verifyCode(data: VerifyCodeRequest): Promise<ApiResponse<VerifyCodeResponse>>;

  // 人脸识别
  registerFace(data: FaceRegisterRequest): Promise<ApiResponse<void>>;
  verifyFace(data: FaceVerifyRequest): Promise<ApiResponse<FaceVerifyResponse>>;
  deleteFace(): Promise<ApiResponse<void>>;

  // 2FA
  setup2FA(data: Setup2FARequest): Promise<ApiResponse<Setup2FAResponse>>;
  verify2FA(data: Verify2FARequest): Promise<ApiResponse<void>>;
  disable2FA(data: Verify2FARequest): Promise<ApiResponse<void>>;

  // 村庄
  getVillages(data?: GetVillagesRequest): Promise<ApiResponse<GetVillagesResponse>>;
}
