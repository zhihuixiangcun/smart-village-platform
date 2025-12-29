/**
 * Mongoose 模型索引
 * 确保模型按正确顺序加载，避免引用错误
 *
 * 加载顺序规则：
 * 1. 先加载基础模型（不引用其他模型）
 * 2. 再加载引用其他模型的模型
 */

const mongoose = require('mongoose');

// 基础模型 - 不依赖其他模型
// 重要：必须完全注册 User 模型后才能加载引用它的模型
require('./User');
// 确保 User 模型已注册
const User = mongoose.model('User');

require('./Village');
require('./Resident');
require('./Household');

// 中级模型 - 可能依赖基础模型
require('./AgriculturalProduct');

// 多模型模块导出
const agricultureModels = require('./Agriculture');

require('./Announcement');
require('./Notification');
require('./Order');
require('./PaymentRecord');

const permissionModels = require('./Permission');
const votingModels = require('./Voting');
const villageCollaborationModels = require('./VillageCollaboration');

// MVP村委管理模型（新增）
require('./CommitteeMember');
require('./DutySchedule');
require('./CommitteeAuditLog');
require('./VillageMap');
require('./CommitteeDocument');
require('./LocationTracking');

// 智能交互和认证模块
require('./SmartInteraction');
require('./SmartAuthentication');

// 聊天功能模型
require('./Friendship');
require('./ChatMessage');
require('./ChatGroup');

// 村委协作平台模型
require('./CollabWorkspace');
require('./TaskAssignment');
require('./Meeting');
require('./WorkLog');
require('./ApprovalRequest');

// 高级模型 - 可能依赖多个其他模型
require('./ApplicationHistory');
require('./BehaviorLog');
require('./EmergencyBroadcast');
const emergencyResponseModels = require('./EmergencyResponse');

require('./FarmProductSupply');
const financeModels = require('./Finance');
require('./MessageLog');
require('./SyncHistory');
require('./UploadHistory');
require('./Task');

// 积分系统模型
const pointsModels = require('./Points');

// 收集所有单模型导出（来自 modules）
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
  VillageMap: mongoose.model('VillageMap'),
  CommitteeDocument: mongoose.model('CommitteeDocument'),
  LocationTracking: mongoose.model('LocationTracking'),
  // 智能交互和认证模块
  UserInteractionPreference: mongoose.model('UserInteractionPreference'),
  VoiceInteractionLog: mongoose.model('VoiceInteractionLog'),
  DialectModel: mongoose.model('DialectModel'),
  FaceBiometric: mongoose.model('FaceBiometric'),
  ProxyAuthorization: mongoose.model('ProxyAuthorization'),
  AuthSession: mongoose.model('AuthSession'),
  // 聊天功能模型
  Friendship: mongoose.model('Friendship'),
  ChatMessage: mongoose.model('ChatMessage'),
  ChatGroup: mongoose.model('ChatGroup'),
  // 村委协作平台模型
  CollabWorkspace: mongoose.model('CollabWorkspace'),
  TaskAssignment: mongoose.model('TaskAssignment'),
  Meeting: mongoose.model('Meeting'),
  WorkLog: mongoose.model('WorkLog'),
  ApprovalRequest: mongoose.model('ApprovalRequest')
};

// 添加别名以支持旧的测试文件
singleModels.Villager = mongoose.model('Resident');
singleModels.News = mongoose.model('Announcement');
singleModels.Affair = mongoose.model('Task');

// 合并所有模型导出
module.exports = {
  ...singleModels,
  ...agricultureModels,
  ...permissionModels,
  ...votingModels,
  ...villageCollaborationModels,
  ...emergencyResponseModels,
  ...financeModels,
  ...pointsModels
};
