/**
 * AES-256 数据加密服务
 * 提供数据加密、解密、密钥管理等功能
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30天
    this.keysPath = path.join(__dirname, '../../config/encryption-keys');
    this.currentKeyId = null;
    this.keys = new Map();

    this.initializeKeys();
  }

  /**
   * 初始化密钥
   */
  async initializeKeys() {
    try {
      await this.ensureKeysDirectory();
      await this.loadKeys();
      await this.rotateKeysIfNeeded();
    } catch (error) {
      logger.error('初始化加密密钥失败:', error);
      throw error;
    }
  }

  /**
   * 确保密钥目录存在
   */
  async ensureKeysDirectory() {
    try {
      await fs.mkdir(this.keysPath, { recursive: true });
    } catch (error) {
      logger.error('创建密钥目录失败:', error);
      throw error;
    }
  }

  /**
   * 加载密钥
   */
  async loadKeys() {
    try {
      const files = await fs.readdir(this.keysPath);
      const keyFiles = files.filter(file => file.endsWith('.key'));

      for (const file of keyFiles) {
        const keyPath = path.join(this.keysPath, file);
        const keyData = await fs.readFile(keyPath, 'utf8');
        const keyInfo = JSON.parse(keyData);

        // 检查密钥是否过期
        if (new Date(keyInfo.expiresAt) > new Date()) {
          this.keys.set(keyInfo.keyId, {
            key: Buffer.from(keyInfo.key, 'hex'),
            created: new Date(keyInfo.createdAt),
            expires: new Date(keyInfo.expiresAt),
            isActive: keyInfo.isActive
          });

          if (keyInfo.isActive && !this.currentKeyId) {
            this.currentKeyId = keyInfo.keyId;
          }
        } else {
          // 删除过期的密钥文件
          await fs.unlink(keyPath);
        }
      }

      if (!this.currentKeyId) {
        await this.generateNewKey();
      }

    } catch (error) {
      logger.error('加载密钥失败:', error);
      // 如果没有密钥文件，生成新的密钥
      await this.generateNewKey();
    }
  }

  /**
   * 生成新密钥
   */
  async generateNewKey() {
    try {
      const keyId = crypto.randomUUID();
      const key = crypto.randomBytes(this.keyLength);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.keyRotationInterval);

      // 如果有当前密钥，标记为非活跃
      if (this.currentKeyId) {
        const currentKey = this.keys.get(this.currentKeyId);
        if (currentKey) {
          currentKey.isActive = false;
          await this.updateKeyFile(this.currentKeyId, currentKey);
        }
      }

      // 保存新密钥
      const keyInfo = {
        keyId,
        key: key.toString('hex'),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isActive: true
      };

      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      await fs.writeFile(keyPath, JSON.stringify(keyInfo, null, 2));

      // 添加到内存
      this.keys.set(keyId, {
        key,
        created: now,
        expires: expiresAt,
        isActive: true
      });

      this.currentKeyId = keyId;

      logger.debug(`新加密密钥已生成: ${keyId}`);
      return keyId;

    } catch (error) {
      logger.error('生成新密钥失败:', error);
      throw error;
    }
  }

  /**
   * 更新密钥文件
   */
  async updateKeyFile(keyId, keyInfo) {
    try {
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      const fileData = {
        keyId,
        key: keyInfo.key.toString('hex'),
        createdAt: keyInfo.created.toISOString(),
        expiresAt: keyInfo.expires.toISOString(),
        isActive: keyInfo.isActive
      };

      await fs.writeFile(keyPath, JSON.stringify(fileData, null, 2));
    } catch (error) {
      logger.error('更新密钥文件失败:', error);
      throw error;
    }
  }

  /**
   * 检查并轮换密钥
   */
  async rotateKeysIfNeeded() {
    try {
      if (!this.currentKeyId) {
        await this.generateNewKey();
        return;
      }

      const currentKey = this.keys.get(this.currentKeyId);
      if (!currentKey || currentKey.expires <= new Date()) {
        await this.generateNewKey();
      }
    } catch (error) {
      logger.error('密钥轮换失败:', error);
    }
  }

  /**
   * 加密数据
   */
  async encrypt(data, keyId = null) {
    try {
      if (typeof data === 'object') {
        data = JSON.stringify(data);
      }

      const useKeyId = keyId || this.currentKeyId;
      const keyInfo = this.keys.get(useKeyId);

      if (!keyInfo) {
        throw new Error(`密钥不存在: ${useKeyId}`);
      }

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, keyInfo.key);
      cipher.setAAD(Buffer.from(useKeyId));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        keyId: useKeyId,
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('数据加密失败:', error);
      throw error;
    }
  }

  /**
   * 解密数据
   */
  async decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag, keyId } = encryptedData;

      const keyInfo = this.keys.get(keyId);
      if (!keyInfo) {
        throw new Error(`解密密钥不存在: ${keyId}`);
      }

      const decipher = crypto.createDecipher(this.algorithm, keyInfo.key);
      decipher.setAAD(Buffer.from(keyId));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }

    } catch (error) {
      logger.error('数据解密失败:', error);
      throw error;
    }
  }

  /**
   * 加密敏感字段
   */
  async encryptSensitiveFields(obj, sensitiveFields = ['idCard', 'phone', 'bankAccount']) {
    try {
      const result = { ...obj };

      for (const field of sensitiveFields) {
        if (result[field]) {
          result[field] = await this.encrypt(result[field]);
        }
      }

      return result;

    } catch (error) {
      logger.error('加密敏感字段失败:', error);
      throw error;
    }
  }

  /**
   * 解密敏感字段
   */
  async decryptSensitiveFields(obj, sensitiveFields = ['idCard', 'phone', 'bankAccount']) {
    try {
      const result = { ...obj };

      for (const field of sensitiveFields) {
        if (result[field] && typeof result[field] === 'object' && result[field].encrypted) {
          result[field] = await this.decrypt(result[field]);
        }
      }

      return result;

    } catch (error) {
      logger.error('解密敏感字段失败:', error);
      throw error;
    }
  }

  /**
   * 生成数据哈希
   */
  generateHash(data, algorithm = 'sha256') {
    try {
      if (typeof data === 'object') {
        data = JSON.stringify(data);
      }

      return crypto.createHash(algorithm).update(data).digest('hex');
    } catch (error) {
      logger.error('生成哈希失败:', error);
      throw error;
    }
  }

  /**
   * 验证数据完整性
   */
  verifyIntegrity(data, expectedHash) {
    try {
      const actualHash = this.generateHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      logger.error('验证数据完整性失败:', error);
      return false;
    }
  }

  /**
   * 批量加密
   */
  async batchEncrypt(items, keyId = null) {
    try {
      const results = [];
      const useKeyId = keyId || this.currentKeyId;

      for (const item of items) {
        const encrypted = await this.encrypt(item, useKeyId);
        results.push(encrypted);
      }

      return results;

    } catch (error) {
      logger.error('批量加密失败:', error);
      throw error;
    }
  }

  /**
   * 批量解密
   */
  async batchDecrypt(encryptedItems) {
    try {
      const results = [];

      for (const item of encryptedItems) {
        const decrypted = await this.decrypt(item);
        results.push(decrypted);
      }

      return results;

    } catch (error) {
      logger.error('批量解密失败:', error);
      throw error;
    }
  }

  /**
   * 生成密钥派生
   */
  deriveKey(password, salt, iterations = 100000) {
    try {
      return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
    } catch (error) {
      logger.error('密钥派生失败:', error);
      throw error;
    }
  }

  /**
   * 安全擦除数据
   */
  secureErase(data) {
    try {
      if (typeof data === 'string') {
        data = Buffer.from(data);
      }

      if (Buffer.isBuffer(data)) {
        data.fill(0);
      }

      return true;
    } catch (error) {
      logger.error('安全擦除失败:', error);
      return false;
    }
  }

  /**
   * 获取密钥信息
   */
  getKeyInfo() {
    const keyInfo = [];

    for (const [keyId, info] of this.keys) {
      keyInfo.push({
        keyId,
        created: info.created,
        expires: info.expires,
        isActive: info.isActive,
        daysUntilExpiry: Math.ceil((info.expires - new Date()) / (1000 * 60 * 60 * 24))
      });
    }

    return {
      currentKeyId: this.currentKeyId,
      totalKeys: keyInfo.length,
      activeKeys: keyInfo.filter(k => k.isActive).length,
      keys: keyInfo
    };
  }

  /**
   * 清理过期密钥
   */
  async cleanupExpiredKeys() {
    try {
      const now = new Date();
      const expiredKeys = [];

      for (const [keyId, info] of this.keys) {
        if (info.expires <= now && !info.isActive) {
          expiredKeys.push(keyId);
        }
      }

      for (const keyId of expiredKeys) {
        const keyPath = path.join(this.keysPath, `${keyId}.key`);
        await fs.unlink(keyPath);
        this.keys.delete(keyId);
      }

      if (expiredKeys.length > 0) {
        logger.debug(`清理了 ${expiredKeys.length} 个过期密钥`);
      }

      return expiredKeys.length;

    } catch (error) {
      logger.error('清理过期密钥失败:', error);
      throw error;
    }
  }

  /**
   * 导出加密统计
   */
  getEncryptionStats() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      keyRotationInterval: this.keyRotationInterval,
      currentKeyId: this.currentKeyId,
      totalKeys: this.keys.size,
      activeKeys: Array.from(this.keys.values()).filter(k => k.isActive).length
    };
  }
}

module.exports = new EncryptionService();