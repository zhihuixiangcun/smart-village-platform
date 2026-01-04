/**
 * Mongoose 模型初始化
 * 按正确顺序加载所有模型
 */

// 禁用重复索引警告 (这些警告不会影响功能)
const originalConsoleWarn = console.warn;
console.warn = function(message, ...args) {
  if (message && message.includes && message.includes('Duplicate schema index')) {
    return; // 忽略重复索引警告
  }
  if (message && message.includes && message.includes('reserved schema pathname')) {
    return; // 忽略保留字段名警告
  }
  originalConsoleWarn.call(console, message, ...args);
};

// 按依赖顺序加载模型
require('./User');
require('./Village');
require('./VillageMap');
require('./DutyShift');
require('./DutyPersonnel');
require('./DutySchedule');
require('./Announcement');
require('./Task');

// 离线数据同步模型（新增）
require('./PendingOperation');
require('./SyncLog');
require('./DataVersion');
require('./DataConflict');
require('./SyncOperation');

// 聊天和社交模型（新增）
console.log('[MODELS] Loading Conversation...');
require('./Conversation');
console.log('[MODELS] Loading Message...');
require('./Message');
console.log('[MODELS] Loading FriendRequest...');
require('./FriendRequest');

// 注册审批和采购商模型（新增）
console.log('[MODELS] Loading RegistrationApplication...');
require('./RegistrationApplication');
console.log('[MODELS] Loading Purchaser...');
require('./Purchaser');
require('./DataVersion');
require('./SyncLog');
require('./SyncOperation');
require('./PendingOperation');
require('./OfflineQueue');
require('./OfflineSyncLog');
require('./Notification');
require('./RealtimeNotification');
require('./Resident');
require('./ResidentProfile');
require('./Emergency');
require('./EmergencyBroadcast');
require('./EmergencyResponse');
require('./EmergencyResource');
require('./Finance');
require('./LedgerProof');
require('./Message');
require('./Conversation');
require('./Comment');
require('./SocialPost');
require('./DutyLog');
require('./DutyCallLog');
require('./RegistrationApplication');
require('./Document');
require('./DocumentCollection');
// require('./Auth'); // 文件不存在
require('./Permission');
// require('./Role'); // 文件不存在
require('./Order');
require('./Product');
require('./AgriculturalProduct');
require('./AgriculturePost');
require('./AgriQA');
require('./AgriculturePolicy');
require('./FarmProductSupply');
require('./Voting');
require('./DataAnalytics');
require('./DataConflict');
require('./FriendRequest');
require('./MessageLog');
require('./PaymentRecord');
require('./CarpoolTrip');
require('./VillageCollaboration');

// 新增的 Dashboard 控制器所需的模型
console.log('[MODELS] Loading Governance...');
require('./Governance');
// ServiceRequest 和 CadreTask 模型临时禁用 - 导致服务器启动挂起
console.log('[MODELS] Skipping ServiceRequest and CadreTask (temporarily disabled)...');
// require('./ServiceRequest');
// require('./CadreTask');
console.log('[MODELS] All models loaded');

// 收集所有单模型导出（来自 modules）
console.log('[MODELS] Building singleModels object...');
const singleModels = {
  User,
  Village: mongoose.model('Village'),
  Resident: mongoose.model('Resident'),
  Household: mongoose.model('Household'),
  AgriculturalProduct: mongoose.model('AgriculturalProduct'),
  Notification: mongoose.model('Notification'),
  Announcement: mongoose.model('Announcement'),
  Order: mongoose.model('Order'),
  PaymentRecord: mongoose.model('PaymentRecord'),
  ApplicationHistory: mongoose.model('ApplicationHistory'),
  BehaviorLog: mongoose.model('BehaviorLog'),
  EmergencyBroadcast: mongoose.model('EmergencyBroadcast'),
  FarmProductSupply: mongoose.model('FarmProductSupply'),
  MessageLog: mongoose.model('MessageLog'),
  SyncHistory: mongoose.model('SyncHistory'),
  UploadHistory: mongoose.model('UploadHistory'),
  // MVP村委管理模型
  CommitteeMember: mongoose.model('CommitteeMember'),
  DutySchedule: mongoose.model('DutySchedule'),
  CommitteeAuditLog: mongoose.model('CommitteeAuditLog'),
  // 离线数据同步模型
  PendingOperation: mongoose.model('PendingOperation'),
  SyncLog: mongoose.model('SyncLog'),
  DataVersion: mongoose.model('DataVersion'),
  DataConflict: mongoose.model('DataConflict'),
  SyncOperation: mongoose.model('SyncOperation'),
  // 聊天和社交模型
  Conversation: mongoose.model('Conversation'),
  Message: mongoose.model('Message'),
  FriendRequest: mongoose.model('FriendRequest'),
  // 注册审批和采购商模型
  RegistrationApplication: mongoose.model('RegistrationApplication'),
  Purchaser: mongoose.model('Purchaser'),
  // Dashboard 控制器所需的模型
  Governance: mongoose.model('Governance')
  // ServiceRequest 已禁用
  // ServiceRequest: mongoose.model('ServiceRequest')
  // CadreTask 已禁用
  // CadreTask: mongoose.model('CadreTask')
};
console.log('[MODELS] singleModels object built');

// 添加别名以支持旧的测试文件
singleModels.Villager = mongoose.model('Resident');
singleModels.News = mongoose.model('Announcement');
// Task 模型未定义，暂时注释掉
// singleModels.Affair = mongoose.model('Task');
console.log('[MODELS] Aliases added');

// 合并所有模型导出
console.log('[MODELS] Building module exports...');
module.exports = {
  User: require('./User'),
  Village: require('./Village'),
  // ... 其他模型的导出
};
console.log('[MODELS] Module exports complete');
