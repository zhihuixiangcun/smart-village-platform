/**
 * 迁移: add_biometric_support
 * 描述: 添加生物特征认证支持
 * 版本: 2024.12.19
 * 创建时间: 2024/12/19 15:30:00
 */

module.exports = {
  version: '2024.12.19',
  name: 'add_biometric_support',
  description: '添加生物特征认证支持，包括人脸识别、声纹识别和指纹识别',

  /**
   * 向上迁移
   * @param {Db} db - 数据库实例
   */
  async up(db) {
    console.log('开始添加生物特征支持...');

    // 1. 为用户集合添加生物特征字段
    console.log('添加生物特征字段到用户集合...');
    await db.collection('users').updateMany(
      { biometrics: { $exists: false } },
      {
        $set: {
          biometrics: {
            faceId: null,
            voiceId: null,
            fingerprint: null,
            enabled: {
              face: false,
              voice: false,
              fingerprint: false
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      }
    );

    // 2. 创建生物特征数据集合
    console.log('创建生物特征数据集合...');
    await db.createCollection('biometric_templates', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'type', 'template', 'createdAt'],
          properties: {
            userId: {
              bsonType: 'objectId',
              description: '用户ID'
            },
            type: {
              bsonType: 'string',
              enum: ['face', 'voice', 'fingerprint'],
              description: '生物特征类型'
            },
            template: {
              bsonType: 'binData',
              description: '生物特征模板数据'
            },
            metadata: {
              bsonType: 'object',
              properties: {
                quality: { bsonType: 'number', minimum: 0, maximum: 1 },
                confidence: { bsonType: 'number', minimum: 0, maximum: 1 },
                device: { bsonType: 'string' },
                algorithm: { bsonType: 'string' }
              }
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'revoked'],
              default: 'active'
            },
            createdAt: {
              bsonType: 'date',
              description: '创建时间'
            },
            lastUsed: {
              bsonType: 'date',
              description: '最后使用时间'
            },
            usageCount: {
              bsonType: 'number',
              default: 0,
              description: '使用次数'
            }
          }
        }
      }
    });

    // 3. 创建索引
    console.log('创建生物特征相关索引...');
    await db.collection('biometric_templates').createIndex({ userId: 1, type: 1 }, { unique: true });
    await db.collection('biometric_templates').createIndex({ type: 1, status: 1 });
    await db.collection('biometric_templates').createIndex({ createdAt: -1 });

    // 4. 添加生物特征验证日志集合
    console.log('创建生物特征验证日志集合...');
    await db.createCollection('biometric_logs', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'type', 'result', 'timestamp'],
          properties: {
            userId: { bsonType: 'objectId' },
            type: {
              bsonType: 'string',
              enum: ['face', 'voice', 'fingerprint']
            },
            result: {
              bsonType: 'string',
              enum: ['success', 'failure', 'timeout', 'error']
            },
            confidence: { bsonType: 'number' },
            error: { bsonType: 'string' },
            ip: { bsonType: 'string' },
            device: { bsonType: 'string' },
            location: {
              bsonType: 'object',
              properties: {
                type: { bsonType: 'string', enum: ['Point'] },
                coordinates: {
                  bsonType: 'array',
                  items: { bsonType: 'number' }
                }
              }
            },
            timestamp: { bsonType: 'date' },
            sessionId: { bsonType: 'string' }
          }
        }
      }
    });

    // 5. 为日志集合创建索引
    await db.collection('biometric_logs').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('biometric_logs').createIndex({ type: 1, timestamp: -1 });
    await db.collection('biometric_logs').createIndex({ result: 1, timestamp: -1 });
    await db.collection('biometric_logs').createIndex({ timestamp: -1 });

    // 6. 添加生物特征认证配置
    console.log('添加生物特征认证配置...');
    await db.collection('system_config').updateOne(
      { _id: 'biometric_settings' },
      {
        $setOnInsert: {
          _id: 'biometric_settings',
          name: '生物特征认证设置',
          settings: {
            faceRecognition: {
              enabled: true,
              threshold: 0.8,
              maxAttempts: 3,
              lockoutDuration: 300, // 5分钟
              requiredLiveness: true,
              supportedDevices: ['iOS', 'Android', 'Web']
            },
            voiceRecognition: {
              enabled: true,
              threshold: 0.85,
              maxAttempts: 3,
              recordDuration: 3000, // 3秒
              silenceThreshold: 0.1,
              supportedLanguages: ['zh-CN', 'pcc', 'pcc-qn']
            },
            fingerprint: {
              enabled: true,
              threshold: 0.9,
              maxAttempts: 5,
              supportedPlatforms: ['iOS', 'Android']
            },
            security: {
              encryptionEnabled: true,
              algorithm: 'AES-256-GCM',
              keyRotationInterval: 90, // 天
              auditLogRetention: 365, // 天
              fraudDetection: {
                enabled: true,
                maxDailyAttempts: 50,
                suspiciousLocationRadius: 1000, // 米
                deviceChangeAlert: true
              }
            },
            privacy: {
              dataRetentionPeriod: 2555, // 7年
              userConsentRequired: true,
              dataPortability: true,
              deletionRights: true
            }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // 7. 更新用户权限，添加生物特征相关权限
    console.log('添加生物特征相关权限...');
    await db.collection('permissions').insertMany([
      {
        _id: 'biometric_enroll_self',
        name: '注册自己的生物特征',
        description: '用户可以注册和更新自己的生物特征信息',
        category: 'biometric',
        level: 'user'
      },
      {
        _id: 'biometric_verify_self',
        name: '使用自己的生物特征认证',
        description: '用户可以使用自己的生物特征进行身份认证',
        category: 'biometric',
        level: 'user'
      },
      {
        _id: 'biometric_manage_others',
        name: '管理他人生物特征',
        description: '管理员可以管理其他用户的生物特征信息',
        category: 'biometric',
        level: 'admin'
      },
      {
        _id: 'biometric_view_logs',
        name: '查看生物特征认证日志',
        description: '查看生物特征认证的历史记录和日志',
        category: 'biometric',
        level: 'admin'
      }
    ]);

    // 8. 为现有角色分配生物特征权限
    await db.collection('roles').updateMany(
      { isSystem: true },
      {
        $addToSet: {
          permissions: {
            $each: ['biometric_verify_self', 'biometric_view_logs']
          }
        }
      }
    );

    await db.collection('roles').updateOne(
      { _id: 'system_admin' },
      {
        $addToSet: {
          permissions: 'biometric_manage_others'
        }
      }
    );

    console.log('✅ 生物特征支持添加完成');
  },

  /**
   * 向下迁移
   * @param {Db} db - 数据库实例
   */
  async down(db) {
    console.log('开始移除生物特征支持...');

    // 1. 删除生物特征集合
    console.log('删除生物特征相关集合...');
    await db.collection('biometric_templates').drop();
    await db.collection('biometric_logs').drop();

    // 2. 移除用户集合中的生物特征字段
    console.log('移除用户集合中的生物特征字段...');
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          biometrics: 1
        }
      }
    );

    // 3. 删除生物特征配置
    console.log('删除生物特征认证配置...');
    await db.collection('system_config').deleteOne({ _id: 'biometric_settings' });

    // 4. 删除生物特征相关权限
    console.log('删除生物特征相关权限...');
    const biometricPermissions = [
      'biometric_enroll_self',
      'biometric_verify_self',
      'biometric_manage_others',
      'biometric_view_logs'
    ];

    await db.collection('permissions').deleteMany({
      _id: { $in: biometricPermissions }
    });

    // 5. 从角色中移除生物特征权限
    await db.collection('roles').updateMany(
      {},
      {
        $pullAll: {
          permissions: biometricPermissions
        }
      }
    );

    console.log('✅ 生物特征支持移除完成');
  }
};