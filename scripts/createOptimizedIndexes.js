/**
 * 数据库索引优化脚本
 * 为智慧乡村项目创建优化的索引策略
 */

const mongoose = require('mongoose');
const config = require('../src/config/database');

// 连接数据库
mongoose.connect(config.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// 索引配置
const INDEX_CONFIGURATIONS = {
  // User集合索引
  User: [
    {
      key: { email: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { username: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { role: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { lastLoginAt: -1 },
      options: { background: true }
    },
    {
      key: { 'profile.phone': 1 },
      options: { sparse: true, background: true }
    }
  ],

  // Resident集合索引
  Resident: [
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { 'household.householdNumber': 1, status: 1 },
      options: { background: true }
    },
    {
      key: { phone: 1 },
      options: { sparse: true, background: true }
    },
    {
      key: { idCard: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { name: 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { age: 1, gender: 1 },
      options: { background: true }
    },
    {
      key: { birthDate: -1 },
      options: { background: true }
    },
    {
      key: { 'specialIdentities.type': 1, status: 1 },
      options: { background: true }
    },
    {
      key: { occupation: 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { 'education.degree': 1 },
      options: { background: true }
    },
    {
      key: { status: 1, villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { location: '2dsphere' },
      options: { background: true, min: -180, max: 180, bits: 26 }
    },
    {
      key: { 'migrantWork.isMigrantWorker': 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { 'poverty.isPovertyHousehold': 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { 'villageParticipation.partyMember': 1, villageId: 1 },
      options: { background: true }
    },
    // 复合索引用于常见查询
    {
      key: { villageId: 1, gender: 1, 'specialIdentities.type': 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, age: 1, occupation: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, 'digital.hasSmartphone': 1 },
      options: { background: true }
    }
  ],

  // Village集合索引
  Village: [
    {
      key: { code: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { province: 1, city: 1, district: 1 },
      options: { background: true }
    },
    {
      key: { isActive: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { 'economy.mainIndustry': 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { adcode: 1 },
      options: { background: true }
    },
    {
      key: { location: '2dsphere' },
      options: { background: true }
    },
    {
      key: { 'poverty.isPovertyVillage': 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { 'digitalization.hasInternet': 1, isActive: 1 },
      options: { background: true }
    }
  ],

  // Finance集合索引
  Finance: [
    {
      key: { villageId: 1, transactionDate: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, type: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { transactionId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { createdBy: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { amount: -1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { category: 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // VillageCollaboration集合索引
  VillageCollaboration: [
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, type: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { participants: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { 'tags': 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { deadline: 1, status: 1 },
      options: { background: true }
    }
  ],

  // Order集合索引
  Order: [
    {
      key: { orderNumber: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { customerId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { productId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { totalAmount: -1, status: 1 },
      options: { background: true }
    },
    {
      key: { createdAt: -1, status: 1 },
      options: { background: true }
    }
  ],

  // AgriculturalProduct集合索引
  AgriculturalProduct: [
    {
      key: { villageId: 1, category: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { name: 'text', description: 'text' },
      options: {
        background: true,
        weights: {
          name: 10,
          description: 5
        }
      }
    },
    {
      key: { price: 1, category: 1 },
      options: { background: true }
    },
    {
      key: { 'seasonalAvailability.season': 1 },
      options: { background: true }
    }
  ],

  // EmergencyBroadcast集合索引
  EmergencyBroadcast: [
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, isActive: 1, priority: -1 },
      options: { background: true }
    },
    {
      key: { type: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { targetAudience: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { expiresAt: 1, isActive: 1 },
      options: { background: true, expireAfterSeconds: 0 }
    }
  ],

  // MessageLog集合索引
  MessageLog: [
    {
      key: { messageId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { recipientId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, type: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { createdAt: -1 },
      options: { background: true, expireAfterSeconds: 7776000 } // 90天过期
    }
  ],

  // Permission集合索引
  Permission: [
    {
      key: { userId: 1, resource: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { userId: 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { role: 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // Household集合索引
  Household: [
    {
      key: { householdNumber: 1, villageId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { qrCode: 1 },
      options: { unique: true, sparse: true, background: true }
    },
    {
      key: { villageId: 1, 'householdType': 1 },
      options: { background: true }
    },
    {
      key: { 'headOfHousehold.idCard': 1 },
      options: { sparse: true, background: true }
    }
  ],

  // 新增：ResidentProfile集合索引
  ResidentProfile: [
    {
      key: { userId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { 'personalInfo.idCard': 1 },
      options: { unique: true, sparse: true, background: true }
    },
    {
      key: { 'personalInfo.phone': 1 },
      options: { sparse: true, background: true }
    },
    {
      key: { villageId: 1, updatedAt: -1 },
      options: { background: true }
    },
    {
      key: { status: 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { 'specialGroups.type': 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { location: '2dsphere' },
      options: { background: true }
    }
  ],

  // 新增：DutySchedule集合索引
  DutySchedule: [
    {
      key: { villageId: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { assignedTo: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, shift: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { date: 1, status: 1 },
      options: { background: true, expireAfterSeconds: 7776000 } // 90天过期
    }
  ],

  // 新增：DutyLog集合索引
  DutyLog: [
    {
      key: { scheduleId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { userId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { createdAt: -1 },
      options: { background: true, expireAfterSeconds: 7776000 } // 90天过期
    }
  ],

  // 新增：FaceRecognition集合索引
  FaceRecognition: [
    {
      key: { userId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { facialDataHash: 1 },
      options: { unique: true, sparse: true, background: true }
    },
    {
      key: { createdAt: -1, status: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, isVerified: 1 },
      options: { background: true }
    }
  ],

  // 新增：Family集合索引
  Family: [
    {
      key: { householdNumber: 1, villageId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, familyType: 1 },
      options: { background: true }
    },
    {
      key: { 'headOfFamily.idCard': 1 },
      options: { sparse: true, background: true }
    },
    {
      key: { members.idCard: 1 },
      options: { sparse: true, background: true }
    },
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { 'specialFamilyType.type': 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // 新增：FamilyProxyRelation集合索引
  FamilyProxyRelation: [
    {
      key: { principalId: 1, agentId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { principalId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { agentId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { expiresAt: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { expiresAt: 1 },
      options: { background: true, expireAfterSeconds: 0 } // 自动过期
    }
  ],

  // 新增：FamilyProxySession集合索引
  FamilyProxySession: [
    {
      key: { sessionId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { proxyRelationId: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { principalId: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { agentId: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { expiresAt: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { expiresAt: 1 },
      options: { background: true, expireAfterSeconds: 0 } // 自动过期
    }
  ],

  // 新增：FamilyProxyAuditLog集合索引
  FamilyProxyAuditLog: [
    {
      key: { proxyRelationId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { sessionId: 1, createdAt: -1 },
      options: { sparse: true, background: true }
    },
    {
      key: { principalId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { agentId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { actionType: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { createdAt: -1 },
      options: { background: true, expireAfterSeconds: 31536000 } // 1年过期
    }
  ],

  // 新增：Emergency集合索引
  Emergency: [
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1, priority: -1 },
      options: { background: true }
    },
    {
      key: { emergencyId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { type: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { reporterId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { location: '2dsphere' },
      options: { background: true }
    },
    {
      key: { status: 1, priority: -1 },
      options: { background: true }
    }
  ],

  // 新增：EmergencyPlan集合索引
  EmergencyPlan: [
    {
      key: { villageId: 1, type: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { type: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, priority: -1 },
      options: { background: true }
    }
  ],

  // 新增：EmergencyResource集合索引
  EmergencyResource: [
    {
      key: { villageId: 1, type: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { name: 'text', description: 'text' },
      options: {
        background: true,
        weights: { name: 10, description: 5 }
      }
    },
    {
      key: { location: '2dsphere' },
      options: { background: true }
    },
    {
      key: { quantity: 1, status: 1 },
      options: { background: true }
    }
  ],

  // 新增：VillageMap集合索引
  VillageMap: [
    {
      key: { villageId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, type: 1 },
      options: { background: true }
    },
    {
      key: { 'features.id': 1 },
      options: { background: true }
    },
    {
      key: { 'features.type': 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // 新增：VillageUser集合索引
  VillageUser: [
    {
      key: { userId: 1, villageId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { userId: 1, role: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, role: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { phone: 1 },
      options: { sparse: true, background: true }
    }
  ],

  // 新增：Document集合索引
  Document: [
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { documentId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, type: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { uploaderId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { title: 'text', content: 'text' },
      options: {
        background: true,
        weights: { title: 10, content: 5 }
      }
    },
    {
      key: { tags: 1, villageId: 1 },
      options: { background: true }
    },
    {
      key: { status: 1, expiresAt: 1 },
      options: { background: true }
    }
  ],

  // 新增：PolicyCalculator集合索引
  PolicyCalculator: [
    {
      key: { villageId: 1, policyType: 1 },
      options: { background: true }
    },
    {
      key: { policyType: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    }
  ],

  // 新增：SubsidyApplication集合索引
  SubsidyApplication: [
    {
      key: { applicationId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { applicantId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { subsidyType: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, subsidyType: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { submittedAt: -1, status: 1 },
      options: { background: true }
    }
  ],

  // 新增：AuditLog集合索引
  AuditLog: [
    {
      key: { userId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, action: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { action: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { entityType: 1, entityId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { ipAddress: 1, createdAt: -1 },
      options: { sparse: true, background: true }
    },
    {
      key: { createdAt: -1 },
      options: { background: true, expireAfterSeconds: 31536000 } // 1年过期
    }
  ],

  // 新增：Notification集合索引
  Notification: [
    {
      key: { recipientId: 1, read: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, type: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { expiresAt: 1, read: 1 },
      options: { background: true }
    },
    {
      key: { createdAt: -1 },
      options: { background: true, expireAfterSeconds: 2592000 } // 30天过期
    }
  ],

  // 新增：Feedback集合索引
  Feedback: [
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { userId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, type: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { status: 1, priority: -1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { category: 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // 新增：Task集合索引
  Task: [
    {
      key: { villageId: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { assignedTo: 1, status: 1, dueDate: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, priority: -1, status: 1 },
      options: { background: true }
    },
    {
      key: { createdBy: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { dueDate: 1, status: 1 },
      options: { background: true }
    },
    {
      key: { tags: 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // 新增：LocationTracking集合索引
  LocationTracking: [
    {
      key: { userId: 1, timestamp: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, timestamp: -1 },
      options: { background: true }
    },
    {
      key: { location: '2dsphere' },
      options: { background: true }
    },
    {
      key: { timestamp: -1 },
      options: { background: true, expireAfterSeconds: 7776000 } // 90天过期
    }
  ],

  // 新增：DataAnalytics集合索引
  DataAnalytics: [
    {
      key: { villageId: 1, type: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { type: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, category: 1, date: -1 },
      options: { background: true }
    },
    {
      key: { date: -1 },
      options: { background: true, expireAfterSeconds: 94608000 } // 3年过期
    }
  ],

  // 新增：Meeting集合索引
  Meeting: [
    {
      key: { villageId: 1, scheduledDate: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1, scheduledDate: -1 },
      options: { background: true }
    },
    {
      key: { participants: 1, scheduledDate: -1 },
      options: { sparse: true, background: true }
    },
    {
      key: { status: 1, scheduledDate: 1 },
      options: { background: true }
    },
    {
      key: { meetingType: 1, villageId: 1 },
      options: { background: true }
    }
  ],

  // 新增：PaymentRecord集合索引
  PaymentRecord: [
    {
      key: { paymentId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { userId: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { type: 1, status: 1, createdAt: -1 },
      options: { background: true }
    },
    {
      key: { amount: -1, villageId: 1 },
      options: { background: true }
    }
  ],

  // 新增：Product集合索引
  Product: [
    {
      key: { productId: 1 },
      options: { unique: true, background: true }
    },
    {
      key: { villageId: 1, category: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { name: 'text', description: 'text' },
      options: {
        background: true,
        weights: { name: 10, description: 5 }
      }
    },
    {
      key: { price: 1, category: 1 },
      options: { background: true }
    },
    {
      key: { villageId: 1, stock: 1, isActive: 1 },
      options: { background: true }
    },
    {
      key: { tags: 1, villageId: 1 },
      options: { background: true }
    }
  ]
};

// TTL索引配置（自动过期）
const TTL_INDEXES = [
  {
    collection: 'Session',
    field: 'expiresAt',
    ttlSeconds: 86400 // 24小时
  },
  {
    collection: 'VerificationCode',
    field: 'expiresAt',
    ttlSeconds: 600 // 10分钟
  },
  {
    collection: 'AuditLog',
    field: 'createdAt',
    ttlSeconds: 31536000 // 1年
  },
  {
    collection: 'Notification',
    field: 'expiresAt',
    ttlSeconds: 2592000 // 30天
  }
];

class IndexOptimizer {
  constructor() {
    this.db = mongoose.connection;
  }

  /**
   * 创建所有优化索引
   */
  async createAllIndexes() {
    console.log('开始创建优化索引...');
    const results = [];

    try {
      await this.db.once('open', async () => {
        console.log('数据库连接成功');

        // 创建配置的索引
        for (const [collectionName, indexes] of Object.entries(INDEX_CONFIGURATIONS)) {
          const collection = this.db.collection(collectionName);
          console.log(`\n处理集合: ${collectionName}`);

          for (const indexConfig of indexes) {
            try {
              await collection.createIndex(indexConfig.key, indexConfig.options);
              console.log(`✓ 创建索引: ${JSON.stringify(indexConfig.key)}`);

              results.push({
                collection: collectionName,
                index: indexConfig.key,
                status: 'success'
              });
            } catch (error) {
              console.error(`✗ 创建索引失败: ${JSON.stringify(indexConfig.key)}, 错误: ${error.message}`);

              results.push({
                collection: collectionName,
                index: indexConfig.key,
                status: 'failed',
                error: error.message
              });
            }
          }
        }

        // 创建TTL索引
        for (const ttlConfig of TTL_INDEXES) {
          try {
            const collection = this.db.collection(ttlConfig.collection);
            await collection.createIndex(
              { [ttlConfig.field]: 1 },
              { expireAfterSeconds: ttlConfig.ttlSeconds, background: true }
            );
            console.log(`✓ 创建TTL索引: ${ttlConfig.collection}.${ttlConfig.field}`);

            results.push({
              collection: ttlConfig.collection,
              index: { [ttlConfig.field]: 1 },
              type: 'TTL',
              status: 'success'
            });
          } catch (error) {
            console.error(`✗ 创建TTL索引失败: ${ttlConfig.collection}.${ttlConfig.field}, 错误: ${error.message}`);

            results.push({
              collection: ttlConfig.collection,
              index: { [ttlConfig.field]: 1 },
              type: 'TTL',
              status: 'failed',
              error: error.message
            });
          }
        }

        await this.analyzeIndexUsage();
        await this.generateIndexReport(results);

        console.log('\n索引创建完成！');
        process.exit(0);
      });
    } catch (error) {
      console.error('索引创建过程中出错:', error);
      process.exit(1);
    }
  }

  /**
   * 分析索引使用情况
   */
  async analyzeIndexUsage() {
    console.log('\n分析索引使用情况...');

    const collections = await this.db.collections();

    for (const collection of collections) {
      const name = collection.collectionName;

      try {
        const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();
        console.log(`\n${name} 集合索引使用情况:`);

        stats.forEach(stat => {
          const usage = stat.accesses;
          console.log(`  - ${stat.name}: ${usage.ops} 次操作 (自 ${usage.since})`);
        });
      } catch (error) {
        console.log(`  无法获取 ${name} 的索引统计`);
      }
    }
  }

  /**
   * 生成索引报告
   */
  async generateIndexReport(results) {
    const report = {
      timestamp: new Date(),
      summary: {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      },
      details: results
    };

    const fs = require('fs').promises;
    const path = require('path');

    const reportPath = path.join(__dirname, '../reports/index-creation-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n索引创建报告已保存到: ${reportPath}`);
    console.log(`总计: ${report.summary.total}, 成功: ${report.summary.success}, 失败: ${report.summary.failed}`);
  }

  /**
   * 删除未使用的索引
   */
  async dropUnusedIndexes() {
    console.log('分析未使用的索引...');

    const collections = await this.db.collections();
    const unusedIndexes = [];

    for (const collection of collections) {
      const name = collection.collectionName;

      try {
        const [indexes, stats] = await Promise.all([
          collection.indexes(),
          collection.aggregate([{ $indexStats: {} }]).toArray()
        ]);

        for (const index of indexes) {
          if (index.name === '_id_') continue; // 不删除默认索引

          const stat = stats.find(s => s.name === index.name);
          const isUnused = stat && stat.accesses.ops === 0;

          if (isUnused) {
            console.log(`未使用索引: ${name}.${index.name}`);
            unusedIndexes.push({ collection: name, index: index.name });
          }
        }
      } catch (error) {
        console.error(`分析 ${name} 索引时出错:`, error.message);
      }
    }

    // 询问是否删除
    if (unusedIndexes.length > 0) {
      console.log(`\n发现 ${unusedIndexes.length} 个未使用的索引`);
      console.log('要删除这些索引，请运行: dropUnusedIndexes()');
    }

    return unusedIndexes;
  }

  /**
   * 重建索引
   */
  async rebuildIndexes(collectionName) {
    console.log(`重建 ${collectionName} 的索引...`);

    try {
      const collection = this.db.collection(collectionName);
      await collection.reIndex();
      console.log(`✓ ${collectionName} 索引重建完成`);
    } catch (error) {
      console.error(`✗ ${collectionName} 索引重建失败:`, error.message);
    }
  }

  /**
   * 验证索引
   */
  async validateIndexes() {
    console.log('验证所有索引...');

    const collections = await this.db.collections();
    const issues = [];

    for (const collection of collections) {
      const name = collection.collectionName;

      try {
        await collection.validateIndexes();
        console.log(`✓ ${name} 索引验证通过`);
      } catch (error) {
        console.error(`✗ ${name} 索引验证失败:`, error.message);
        issues.push({ collection: name, error: error.message });
      }
    }

    return issues;
  }
}

// 使用示例
async function main() {
  const optimizer = new IndexOptimizer();

  const command = process.argv[2];

  switch (command) {
    case 'create':
      await optimizer.createAllIndexes();
      break;
    case 'analyze':
      await optimizer.analyzeIndexUsage();
      break;
    case 'cleanup':
      await optimizer.dropUnusedIndexes();
      break;
    case 'validate':
      await optimizer.validateIndexes();
      break;
    default:
      console.log('使用方法:');
      console.log('  node createOptimizedIndexes.js create     - 创建所有优化索引');
      console.log('  node createOptimizedIndexes.js analyze    - 分析索引使用情况');
      console.log('  node createOptimizedIndexes.js cleanup    - 查找未使用的索引');
      console.log('  node createOptimizedIndexes.js validate   - 验证索引完整性');
      process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = IndexOptimizer;