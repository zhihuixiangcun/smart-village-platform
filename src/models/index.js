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
require('./CommitteeMember');
require('./Family');
// require('./FamilyMember'); // 文件不存在,位于server/models目录
require('./FamilyProxyRelation');
require('./FamilyProxySession');
require('./FaceRecognition');
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
require('./Auth');
require('./Permission');
require('./Role');
require('./Order');
require('./Product');
require('./AgriculturalProduct');
require('./AgriculturePost');
require('./FarmProductSupply');
require('./Voting');
require('./DataAnalytics');
require('./DataConflict');
require('./FriendRequest');
require('./MessageLog');
require('./PaymentRecord');
require('./CarpoolTrip');
require('./VillageCollaboration');

module.exports = {
  User: require('./User'),
  Village: require('./Village'),
  // ... 其他模型的导出
};
