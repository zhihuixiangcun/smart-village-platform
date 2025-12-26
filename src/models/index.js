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

// 收集所有单模型导出（来自 modules）
const singleModels = {
  User,
  Village: mongoose.model('Village'),
  Resident: mongoose.model('Resident'),
  Household: mongoose.model('Household'),
  AgriculturalProduct: mongoose.model('AgriculturalProduct'),
  Notification: mongoose.model('Notification'),
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
  CommitteeAuditLog: mongoose.model('CommitteeAuditLog')
};

// 合并所有模型导出
module.exports = {
  ...singleModels,
  ...agricultureModels,
  ...permissionModels,
  ...votingModels,
  ...villageCollaborationModels,
  ...emergencyResponseModels,
  ...financeModels
};
