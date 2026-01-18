/**
 * Models Index
 * 统一加载所有数据模型
 */

const Message = require('./Message');
const Conversation = require('./Conversation');
const User = require('./User');
const Family = require('./Family');
const FamilyMember = require('./FamilyMember');
const Village = require('./Village');
const SecurityAudit = require('./SecurityAudit');
const ResidentLocation = require('./ResidentLocation');
const PrivacyRule = require('./PrivacyRule');
const MapLocation = require('./MapLocation');
const FraudNumber = require('./FraudNumber');
const EmergencyResource = require('./EmergencyResource');
const DangerZone = require('./DangerZone');
const BlockchainRecord = require('./BlockchainRecord');
const Duty = require('./duty');
const EmergencyCall = require('./EmergencyCall');

// 导出所有模型
module.exports = {
  Message,
  Conversation,
  User,
  Family,
  FamilyMember,
  Village,
  SecurityAudit,
  ResidentLocation,
  PrivacyRule,
  MapLocation,
  FraudNumber,
  EmergencyResource,
  DangerZone,
  BlockchainRecord,
  Duty,
  EmergencyCall
};

console.log('✅ All models loaded successfully');
