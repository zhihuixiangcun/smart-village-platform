/**
 * 加密管理器
 * 负责人脸识别系统的加密存储、密钥管理和安全操作
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

class CryptoManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationAlgorithm = 'sha256';
    this.saltLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30天

    // 密钥存储路径
    this.keysPath = path.join(__dirname, '../../data/keys');
    this.keysFile = path.join(this.keysPath, 'encryption_keys.json');

    this.keys = new Map();
    this.initialized = false;
  }

  /**
   * 初始化加密管理器
   */
  async initialize() {
    try {
      await this.ensureKeysDirectory();
      await this.loadKeys();
      await this.checkKeyRotation();
      this.initialized = true;
      console.log('加密管理器初始化成功');
    } catch (error) {
      console.error('加密管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保密钥目录存在
   */
  async ensureKeysDirectory() {
    try {
      await fs.access(this.keysPath);
    } catch (error) {
      await fs.mkdir(this.keysPath, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 生成主密钥
   */
  generateMasterKey() {
    return crypto.randomBytes(32);
  }

  /**
   * 从密码派生密钥
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, this.keyDerivationAlgorithm);
  }

  /**
   * 生成新的加密密钥
   */
  generateKey() {
    const keyId = crypto.randomUUID();
    const key = crypto.randomBytes(32);
    const createdAt = Date.now();
    const version = 1;

    return {
      keyId,
      key: key.toString('base64'),
      createdAt,
      version,
      isActive: true,
      lastUsed: createdAt
    };
  }

  /**
   * 加密数据
   */
  async encrypt(data, keyId = null) {
    if (!this.initialized) {
      throw new Error('加密管理器未初始化');
    }

    // 如果没有指定密钥，使用默认密钥
    if (!keyId) {
      keyId = this.getDefaultKeyId();
    }

    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`密钥不存在: ${keyId}`);
    }

    const key = Buffer.from(keyData.key, 'base64');
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 更新密钥使用时间
    keyData.lastUsed = Date.now();
    await this.saveKeys();

    return {
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex'),
      keyId: keyId,
      algorithm: this.algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * 解密数据
   */
  async decrypt(encryptedObject) {
    if (!this.initialized) {
      throw new Error('加密管理器未初始化');
    }

    const { encryptedData, authTag, iv, keyId } = encryptedObject;

    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`密钥不存在: ${keyId}`);
    }

    const key = Buffer.from(keyData.key, 'base64');
    const decipher = crypto.createDecipher(this.algorithm, key);

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * 加密人脸特征向量
   */
  async encryptFaceFeatures(features, metadata = {}) {
    const data = {
      features: features,
      metadata: {
        ...metadata,
        algorithmVersion: '1.0',
        encryptedAt: Date.now()
      }
    };

    const encrypted = await this.encrypt(data);

    return {
      encryptedFeatures: `${encrypted.encryptedData}:${encrypted.authTag}:${encrypted.iv}`,
      keyId: encrypted.keyId,
      algorithm: encrypted.algorithm,
      timestamp: encrypted.timestamp
    };
  }

  /**
   * 解密人脸特征向量
   */
  async decryptFaceFeatures(encryptedString) {
    const [encryptedData, authTag, iv] = encryptedString.split(':');

    const encryptedObject = {
      encryptedData,
      authTag,
      iv,
      keyId: await this.extractKeyId(encryptedString)
    };

    const decrypted = await this.decrypt(encryptedObject);
    return decrypted;
  }

  /**
   * 从加密字符串中提取密钥ID
   */
  async extractKeyId(encryptedString) {
    // 这里需要根据实际存储格式来提取
    // 暂时返回默认密钥ID
    return this.getDefaultKeyId();
  }

  /**
   * 生成特征哈希（不可逆）
   */
  generateFeatureHash(features) {
    const featureString = JSON.stringify(features);
    return crypto.createHash('sha256')
      .update(featureString)
      .digest('hex');
  }

  /**
   * 安全哈希（用于密码存储）
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 验证密码
   */
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成HMAC签名
   */
  generateHMAC(data, secret) {
    return crypto.createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * 验证HMAC签名
   */
  verifyHMAC(data, signature, secret) {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * 生成安全的随机令牌
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * 加载密钥
   */
  async loadKeys() {
    try {
      const keysData = await fs.readFile(this.keysFile, 'utf8');
      const keysObject = JSON.parse(keysData);

      for (const keyData of keysObject.keys) {
        this.keys.set(keyData.keyId, keyData);
      }

      console.log(`已加载 ${this.keys.size} 个密钥`);
    } catch (error) {
      // 如果密钥文件不存在，生成新的密钥
      if (error.code === 'ENOENT') {
        await this.generateInitialKeys();
      } else {
        throw error;
      }
    }
  }

  /**
   * 保存密钥
   */
  async saveKeys() {
    const keysArray = Array.from(this.keys.values());
    const keysData = {
      version: '1.0',
      updatedAt: Date.now(),
      keys: keysArray
    };

    await fs.writeFile(this.keysFile, JSON.stringify(keysData, null, 2), 'utf8');
  }

  /**
   * 生成初始密钥
   */
  async generateInitialKeys() {
    const initialKey = this.generateKey();
    this.keys.set(initialKey.keyId, initialKey);
    await this.saveKeys();
    console.log('已生成初始加密密钥');
  }

  /**
   * 检查密钥轮换
   */
  async checkKeyRotation() {
    const now = Date.now();
    const defaultKey = this.keys.get(this.getDefaultKeyId());

    if (defaultKey && (now - defaultKey.createdAt) > this.keyRotationInterval) {
      await this.rotateKey();
    }
  }

  /**
   * 轮换密钥
   */
  async rotateKey() {
    const newKey = this.generateKey();
    this.keys.set(newKey.keyId, newKey);

    // 标记旧密钥为非活跃状态
    for (const [keyId, keyData] of this.keys) {
      if (keyId !== this.getDefaultKeyId()) {
        keyData.isActive = false;
      }
    }

    await this.saveKeys();
    console.log('密钥轮换完成');
  }

  /**
   * 获取默认密钥ID
   */
  getDefaultKeyId() {
    for (const [keyId, keyData] of this.keys) {
      if (keyData.isActive) {
        return keyId;
      }
    }
    throw new Error('没有可用的活跃密钥');
  }

  /**
   * 获取密钥信息
   */
  getKeyInfo(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      return null;
    }

    // 返回安全的密钥信息（不包含实际密钥）
    return {
      keyId: keyData.keyId,
      createdAt: keyData.createdAt,
      version: keyData.version,
      isActive: keyData.isActive,
      lastUsed: keyData.lastUsed
    };
  }

  /**
   * 列出所有密钥信息
   */
  listKeys() {
    const keysInfo = [];
    for (const [keyId, keyData] of this.keys) {
      keysInfo.push(this.getKeyInfo(keyId));
    }
    return keysInfo;
  }

  /**
   * 删除旧密钥
   */
  async cleanupOldKeys(maxAge = 90 * 24 * 60 * 60 * 1000) { // 90天
    const now = Date.now();
    const keysToDelete = [];

    for (const [keyId, keyData] of this.keys) {
      if (!keyData.isActive && (now - keyData.lastUsed) > maxAge) {
        keysToDelete.push(keyId);
      }
    }

    for (const keyId of keysToDelete) {
      this.keys.delete(keyId);
    }

    if (keysToDelete.length > 0) {
      await this.saveKeys();
      console.log(`已清理 ${keysToDelete.length} 个旧密钥`);
    }
  }

  /**
   * 数据脱敏
   */
  maskSensitiveData(data, fields = ['password', 'idCard', 'bankAccount']) {
    const masked = { ...data };

    for (const field of fields) {
      if (masked[field]) {
        masked[field] = this.maskString(masked[field]);
      }
    }

    return masked;
  }

  /**
   * 字符串脱敏
   */
  maskString(str, visibleChars = 4, maskChar = '*') {
    if (!str || str.length <= visibleChars) {
      return str;
    }

    const start = str.substring(0, Math.floor(visibleChars / 2));
    const end = str.substring(str.length - Math.ceil(visibleChars / 2));
    const middle = maskChar.repeat(str.length - visibleChars);

    return start + middle + end;
  }

  /**
   * 生成数据完整性校验码
   */
  generateIntegrityChecksum(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * 验证数据完整性
   */
  verifyIntegrity(data, checksum) {
    const currentChecksum = this.generateIntegrityChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(checksum, 'hex'),
      Buffer.from(currentChecksum, 'hex')
    );
  }
}

// 创建单例实例
const cryptoManager = new CryptoManager();

module.exports = cryptoManager;