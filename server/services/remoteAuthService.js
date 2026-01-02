/**
 * Remote Authentication Service
 * 远程认证服务
 *
 * 功能：
 * 1. 人脸识别登录
 * 2. 亲属代理功能
 * 3. 活体检测
 * 4. 认证记录管理
 * 5. Token管理
 */

const FamilyMember = require('../models/FamilyMember');
const Family = require('../models/Family');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 人脸识别配置
const FACE_RECOGNITION_CONFIG = {
  // 相似度阈值（0-1，越高越严格）
  SIMILARITY_THRESHOLD: 0.6,
  // 最大失败次数
  MAX_FAILED_ATTEMPTS: 5,
  // 锁定时间（分钟）
  LOCK_DURATION: 30,
  // Token有效期（天）
  TOKEN_EXPIRY_DAYS: 30
};

class RemoteAuthService {
  constructor() {
    // 存储临时认证会话
    this.authSessions = new Map();
  }

  /**
   * 初始化人脸识别
   * @param {String} memberId - 成员ID
   * @param {String} faceImageBase64 - 人脸图片Base64
   * @returns {Promise<Object>}
   */
  async initializeFaceAuth(memberId, faceImageBase64) {
    try {
      const member = await FamilyMember.findById(memberId)
        .populate('familyId');

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 检查账户是否可用
      if (!member.isAuthAvailable()) {
        throw new Error('账户已被锁定，请稍后再试');
      }

      // 生成会话ID
      const sessionId = crypto.randomUUID();

      // 存储临时会话
      this.authSessions.set(sessionId, {
        memberId,
        familyId: member.familyId._id,
        faceImageBase64,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟过期
      });

      return {
        sessionId,
        message: '请将人脸对准摄像头，保持光线充足'
      };
    } catch (error) {
      throw new Error(`初始化认证失败: ${error.message}`);
    }
  }

  /**
   * 执行人脸识别
   * 注意：这是一个简化版本，实际应用需要集成face-api.js或其他专业库
   * @param {String} sessionId - 会话ID
   * @param {String} capturedImageBase64 - 捕获的人脸图片
   * @returns {Promise<Object>}
   */
  async performFaceRecognition(sessionId, capturedImageBase64) {
    try {
      // 获取会话
      const session = this.authSessions.get(sessionId);

      if (!session) {
        throw new Error('会话已过期，请重新开始');
      }

      if (Date.now() > session.expiresAt) {
        this.authSessions.delete(sessionId);
        throw new Error('会话已过期，请重新开始');
      }

      const member = await FamilyMember.findById(session.memberId);

      if (!member) {
        throw new Error('成员不存在');
      }

      // 检查账户是否可用
      if (!member.isAuthAvailable()) {
        throw new Error('账户已被锁定，请稍后再试');
      }

      // 实际应用中，这里应该调用face-api.js或其他专业库进行人脸识别
      // 这里使用简化版本
      const recognitionResult = await this.simulateFaceRecognition(
        session.faceImageBase64,
        capturedImageBase64,
        member.authentication.faceDescriptor
      );

      if (recognitionResult.success) {
        // 认证成功
        member.authentication.status = 'VERIFIED';
        member.authentication.lastAuthTime = new Date();
        member.authentication.failedAttempts = 0;
        member.authentication.lockedUntil = null;

        // 保存新的人脸特征（如果注册）
        if (recognitionResult.faceDescriptor) {
          member.authentication.faceDescriptor = recognitionResult.faceDescriptor;
        }

        await member.save();

        // 生成认证Token
        const token = this.generateAuthToken(member, session.familyId);

        // 清除会话
        this.authSessions.delete(sessionId);

        return {
          success: true,
          token,
          member: {
            id: member._id,
            name: member.name,
            relationship: member.relationship,
            familyId: session.familyId
          },
          message: '认证成功'
        };
      } else {
        // 认证失败
        await member.recordAuthFailure();

        return {
          success: false,
          message: `认证失败: ${recognitionResult.message}`,
          attemptsRemaining: FACE_RECOGNITION_CONFIG.MAX_FAILED_ATTEMPTS - member.authentication.failedAttempts
        };
      }
    } catch (error) {
      throw new Error(`人脸识别失败: ${error.message}`);
    }
  }

  /**
   * 模拟人脸识别（实际应用需要使用face-api.js或其他专业库）
   * @private
   */
  async simulateFaceRecognition(storedImage, capturedImage, storedDescriptor) {
    // 这里是一个简化的模拟实现
    // 实际应用中应该：
    // 1. 使用face-api.js加载模型
    // 2. 检测人脸
    // 3. 提取特征向量（descriptor）
    // 4. 计算欧氏距离
    // 5. 判断是否匹配

    return new Promise((resolve) => {
      // 模拟检测延迟
      setTimeout(() => {
        // 在实际应用中，这里应该进行真实的人脸识别
        // 暂时返回成功用于测试
        resolve({
          success: true,
          confidence: 0.95,
          message: '识别成功',
          faceDescriptor: [] // 实际应该是128维特征向量
        });
      }, 1000);
    });
  }

  /**
   * 注册人脸信息
   * @param {String} memberId - 成员ID
   * @param {String} faceImageBase64 - 人脸图片
   * @returns {Promise<Object>}
   */
  async registerFace(memberId, faceImageBase64) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 保存人脸照片
      // 实际应用中应该上传到云存储
      member.authentication.facePhoto = this.saveFacePhoto(memberId, faceImageBase64);

      // 生成人脸特征向量（实际应用使用face-api.js）
      member.authentication.faceDescriptor = await this.extractFaceDescriptor(faceImageBase64);

      member.authentication.status = 'VERIFIED';
      await member.save();

      // 添加操作日志
      const family = await Family.findById(member.familyId);
      await family.addLog(
        '系统',
        null,
        '注册人脸信息',
        { memberName: member.name }
      );

      return {
        success: true,
        message: '人脸注册成功'
      };
    } catch (error) {
      throw new Error(`注册人脸失败: ${error.message}`);
    }
  }

  /**
   * 提取人脸特征向量（模拟）
   * @private
   */
  async extractFaceDescriptor(faceImageBase64) {
    // 实际应用使用face-api.js
    // const detector = new faceapi.SsdMobilenetv1Options();
    // const detection = await faceapi.detectSingleFace(image, detector).withFaceLandmarks().withFaceDescriptor();
    // return detection.descriptor;

    // 模拟返回128维特征向量
    return Array(128).fill(0).map(() => Math.random());
  }

  /**
   * 保存人脸照片（模拟）
   * @private
   */
  saveFacePhoto(memberId, faceImageBase64) {
    // 实际应用应该上传到云存储（如OSS、S3）
    // 这里返回模拟URL
    return `/uploads/faces/${memberId}_${Date.now()}.jpg`;
  }

  /**
   * 生成认证Token
   * @private
   */
  generateAuthToken(member, familyId) {
    const payload = {
      memberId: member._id,
      familyId,
      name: member.name,
      relationship: member.relationship,
      type: 'remote_auth'
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: `${FACE_RECOGNITION_CONFIG.TOKEN_EXPIRY_DAYS}d`
      }
    );
  }

  /**
   * 验证Token
   * @param {String} token - 认证Token
   * @returns {Promise<Object>}
   */
  async verifyAuthToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      if (decoded.type !== 'remote_auth') {
        throw new Error('Token类型无效');
      }

      const member = await FamilyMember.findById(decoded.memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      return {
        valid: true,
        member: {
          id: member._id,
          name: member.name,
          relationship: member.relationship,
          familyId: decoded.familyId
        }
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  /**
   * 请求亲属代理认证
   * @param {String} memberId - 成员ID
   * @param {String} proxyMemberId - 代理成员ID
   * @returns {Promise<Object>}
   */
  async requestProxyAuth(memberId, proxyMemberId) {
    try {
      const member = await FamilyMember.findById(memberId)
        .populate('familyId');

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      const proxyMember = await FamilyMember.findById(proxyMemberId);

      if (!proxyMember || proxyMember.isDeleted) {
        throw new Error('代理成员不存在');
      }

      // 检查是否在同一家庭
      if (proxyMember.familyId.toString() !== member.familyId.toString()) {
        throw new Error('代理成员必须与被代理人在同一家庭');
      }

      // 检查是否已授权
      if (!member.proxySettings.enabled) {
        throw new Error('该成员未开启代理功能');
      }

      const isAllowed = member.proxySettings.allowedProxies.some(
        id => id.toString() === proxyMemberId
      );

      if (!isAllowed) {
        throw new Error('该成员未授权给此代理');
      }

      // 检查代理授权是否过期
      if (member.proxySettings.expiryDate && new Date() > member.proxySettings.expiryDate) {
        throw new Error('代理授权已过期');
      }

      // 生成代理认证Token
      const token = this.generateAuthToken(member, member.familyId);

      return {
        success: true,
        token,
        member: {
          id: member._id,
          name: member.name,
          relationship: member.relationship
        },
        proxy: {
          id: proxyMember._id,
          name: proxyMember.name,
          relationship: proxyMember.relationship
        },
        message: '代理认证成功'
      };
    } catch (error) {
      throw new Error(`代理认证失败: ${error.message}`);
    }
  }

  /**
   * 设置代理配置
   * @param {String} memberId - 成员ID
   * @param {Array} allowedProxyIds - 允许代理的成员ID列表
   * @param {Number} expiryDays - 授权有效期（天），null表示永久
   * @returns {Promise<Object>}
   */
  async setProxySettings(memberId, allowedProxyIds, expiryDays = null) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 验证代理成员是否在同一家庭
      const familyMembers = await FamilyMember.findByFamilyId(member.familyId);
      const familyMemberIds = familyMembers.map(m => m._id.toString());

      const invalidProxies = allowedProxyIds.filter(id => !familyMemberIds.includes(id));
      if (invalidProxies.length > 0) {
        throw new Error('代理成员必须与被代理人在同一家庭');
      }

      // 更新代理设置
      member.proxySettings.enabled = true;
      member.proxySettings.allowedProxies = allowedProxyIds;
      member.proxySettings.expiryDate = expiryDays
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
        : null;

      await member.save();

      // 添加操作日志
      const family = await Family.findById(member.familyId);
      await family.addLog(
        '系统',
        null,
        '设置代理配置',
        {
          memberName: member.name,
          proxyCount: allowedProxyIds.length,
          expiryDays
        }
      );

      return {
        success: true,
        message: '代理设置成功'
      };
    } catch (error) {
      throw new Error(`设置代理失败: ${error.message}`);
    }
  }

  /**
   * 获取可用代理列表
   * @param {String} memberId - 成员ID
   * @returns {Promise<Array>}
   */
  async getAvailableProxies(memberId) {
    try {
      const member = await FamilyMember.findById(memberId)
        .populate('proxySettings.allowedProxies', 'name relationship phone');

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 获取家庭成员
      const familyMembers = await FamilyMember.findByFamilyId(member.familyId);

      // 过滤掉自己
      const availableProxies = familyMembers
        .filter(m => m._id.toString() !== memberId)
        .map(m => ({
          id: m._id,
          name: m.name,
          relationship: m.relationship,
          phone: m.phoneMasked,
          isAuthorized: member.proxySettings.allowedProxies.some(
            ap => ap._id.toString() === m._id.toString()
          )
        }));

      return availableProxies;
    } catch (error) {
      throw new Error(`获取代理列表失败: ${error.message}`);
    }
  }

  /**
   * 活体检测（模拟）
   * 实际应用需要集成专业活体检测SDK
   * @param {String} imageBase64 - 人脸图片
   * @returns {Promise<Object>}
   */
  async performLivenessDetection(imageBase64) {
    try {
      // 实际应用应该：
      // 1. 使用专业活体检测SDK（如Face++、阿里云、腾讯云等）
      // 2. 进行眨眼、张嘴、转头等动作检测
      // 3. 检测照片翻拍、屏幕攻击等

      // 这里返回模拟结果
      return {
        success: true,
        isLive: true,
        confidence: 0.98,
        message: '活体检测通过'
      };
    } catch (error) {
      throw new Error(`活体检测失败: ${error.message}`);
    }
  }

  /**
   * 获取认证记录
   * @param {String} memberId - 成员ID
   * @param {Number} limit - 返回记录数量
   * @returns {Promise<Array>}
   */
  async getAuthHistory(memberId, limit = 10) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 获取家庭操作日志中的认证相关记录
      const family = await Family.findById(member.familyId);
      const authLogs = family.operationLogs
        .filter(log =>
          log.operation.includes('认证') ||
          log.operation.includes('人脸')
        )
        .sort({ timestamp: -1 })
        .slice(0, limit);

      return authLogs.map(log => ({
        operator: log.operator,
        operation: log.operation,
        timestamp: log.timestamp,
        details: log.details
      }));
    } catch (error) {
      throw new Error(`获取认证记录失败: ${error.message}`);
    }
  }

  /**
   * 重置认证状态
   * @param {String} memberId - 成员ID
   * @returns {Promise<Object>}
   */
  async resetAuthStatus(memberId) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      await member.resetAuthAttempts();

      return {
        success: true,
        message: '认证状态已重置'
      };
    } catch (error) {
      throw new Error(`重置认证状态失败: ${error.message}`);
    }
  }

  /**
   * 清理过期会话
   */
  cleanExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.authSessions.entries()) {
      if (now > session.expiresAt) {
        this.authSessions.delete(sessionId);
      }
    }
  }
}

// 定期清理过期会话（每5分钟）
setInterval(() => {
  const service = new RemoteAuthService();
  service.cleanExpiredSessions();
}, 5 * 60 * 1000);

module.exports = new RemoteAuthService();
