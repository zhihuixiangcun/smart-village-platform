/**
 * 智慧村庄平台 - 数据加密服务
 * 提供数据加密、解密、哈希和安全存储功能
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * 加密算法配置
 */
const ENCRYPTION_CONFIG = {
  // AES-256-GCM 配置
  AES: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,      // 256 bits
    ivLength: 16,        // 128 bits
    tagLength: 16,       // 128 bits
    encoding: 'hex'
  },

  // RSA 配置
  RSA: {
    algorithm: 'rsa',
    keySize: 2048,       // 2048 bits
    publicEncoding: 'spki',
    privateEncoding: 'pkcs8',
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  },

  // 哈希配置
  HASH: {
    algorithm: 'sha256',
    saltLength: 32,      // 32 bytes
    iterations: 100000    // PBKDF2 iterations
  }
};

/**
 * 敏感字段加密映射
 */
const ENCRYPTED_FIELDS = {
  // 身份信息
  personal: ['idCard', 'passport', 'socialSecurityNumber'],

  // 联系信息
  contact: ['phone', 'email', 'address'],

  // 金融信息
  financial: ['bankAccount', 'creditCard', 'insuranceNumber', 'taxId'],

  // 健康信息
  health: ['medicalRecord', 'bloodType', 'allergies', 'medications'],

  // 系统信息
  system: ['password', 'secretKey', 'apiKey', 'token', 'privateKey']
};

/**
 * 加密服务类
 */
class EncryptionService {
  constructor() {
    this.masterKey = this.generateMasterKey();
    this.dataKeys = new Map(); // 数据加密密钥缓存
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30天
    this.lastKeyRotation = Date.now();

    // 初始化数据密钥
    this.initializeDataKeys();

    // 启动密钥轮转
    this.startKeyRotation();
  }

  /**
   * 生成主密钥
   */
  generateMasterKey() {
    const key = process.env.ENCRYPTION_MASTER_KEY;

    if (key) {
      // 从环境变量获取
      return Buffer.from(key, 'hex');
    }

    // 生成新的主密钥（仅用于开发环境）
    logger.warn('使用临时主密钥，生产环境请设置 ENCRYPTION_MASTER_KEY 环境变量');
    return crypto.randomBytes(32);
  }

  /**
   * 初始化数据加密密钥
   */
  initializeDataKeys() {
    // 为不同数据类型生成专用密钥
    const dataTypes = ['personal', 'contact', 'financial', 'health', 'system'];

    dataTypes.forEach(dataType => {
      this.dataKeys.set(dataType, this.generateDataKey(dataType));
    });

    logger.info('数据加密密钥初始化完成', {
      keyCount: dataTypes.length
    });
  }

  /**
   * 生成数据加密密钥
   */
  generateDataKey(dataType) {
    const hmac = crypto.createHmac('sha256', this.masterKey);
    hmac.update(dataType);
    hmac.update(Date.now().toString());

    return hmac.digest();
  }

  /**
   * 获取数据加密密钥
   */
  getDataKey(dataType) {
    return this.dataKeys.get(dataType) || this.dataKeys.get('system');
  }

  /**
   * AES加密
   */
  aesEncrypt(data, key = null) {
    try {
      const encryptKey = key || this.getDataKey('system');
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.AES.ivLength);

      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.AES.algorithm, encryptKey);
      cipher.setAAD(Buffer.from('smart-village', 'utf8'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        algorithm: ENCRYPTION_CONFIG.AES.algorithm,
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        encoding: ENCRYPTION_CONFIG.AES.encoding
      };

    } catch (error) {
      logger.error('AES加密失败', {
        error: error.message
      });
      throw new Error('数据加密失败');
    }
  }

  /**
   * AES解密
   */
  aesDecrypt(encryptedData, key = null) {
    try {
      const decryptKey = key || this.getDataKey('system');

      const decipher = crypto.createDecipher(
        ENCRYPTION_CONFIG.AES.algorithm,
        decryptKey
      );

      decipher.setAAD(Buffer.from('smart-village', 'utf8'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      logger.error('AES解密失败', {
        error: error.message
      });
      throw new Error('数据解密失败');
    }
  }

  /**
   * RSA公钥加密
   */
  rsaEncrypt(data, publicKey) {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: ENCRYPTION_CONFIG.RSA.padding,
          oaepHash: ENCRYPTION_CONFIG.RSA.oaepHash
        },
        Buffer.from(data, 'utf8')
      );

      return {
        algorithm: ENCRYPTION_CONFIG.RSA.algorithm,
        encrypted: encrypted.toString('base64'),
        encoding: 'base64'
      };

    } catch (error) {
      logger.error('RSA加密失败', {
        error: error.message
      });
      throw new Error('RSA加密失败');
    }
  }

  /**
   * RSA私钥解密
   */
  rsaDecrypt(encryptedData, privateKey) {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: ENCRYPTION_CONFIG.RSA.padding,
          oaepHash: ENCRYPTION_CONFIG.RSA.oaepHash
        },
        Buffer.from(encryptedData.encrypted, 'base64')
      );

      return decrypted.toString('utf8');

    } catch (error) {
      logger.error('RSA解密失败', {
        error: error.message
      });
      throw new Error('RSA解密失败');
    }
  }

  /**
   * 生成RSA密钥对
   */
  generateRSAKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync(
        ENCRYPTION_CONFIG.RSA.algorithm,
        {
          modulusLength: ENCRYPTION_CONFIG.RSA.keySize,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        }
      );

      return {
        publicKey: publicKey.toString(),
        privateKey: privateKey.toString(),
        keySize: ENCRYPTION_CONFIG.RSA.keySize,
        algorithm: ENCRYPTION_CONFIG.RSA.algorithm
      };

    } catch (error) {
      logger.error('RSA密钥对生成失败', {
        error: error.message
      });
      throw new Error('密钥对生成失败');
    }
  }

  /**
   * 生成安全哈希
   */
  hash(data, salt = null) {
    try {
      // 如果没有提供盐值，生成随机盐值
      const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(ENCRYPTION_CONFIG.HASH.saltLength);

      // 使用PBKDF2生成哈希
      const hash = crypto.pbkdf2Sync(
        data,
        saltBuffer,
        ENCRYPTION_CONFIG.HASH.iterations,
        64,
        ENCRYPTION_CONFIG.HASH.algorithm
      );

      return {
        hash: hash.toString('hex'),
        salt: saltBuffer.toString('hex'),
        algorithm: ENCRYPTION_CONFIG.HASH.algorithm,
        iterations: ENCRYPTION_CONFIG.HASH.iterations
      };

    } catch (error) {
      logger.error('哈希生成失败', {
        error: error.message
      });
      throw new Error('哈希生成失败');
    }
  }

  /**
   * 验证哈希
   */
  verifyHash(data, hashData) {
    try {
      const { hash, salt, algorithm, iterations } = hashData;

      const computedHash = crypto.pbkdf2Sync(
        data,
        Buffer.from(salt, 'hex'),
        iterations,
        64,
        algorithm
      );

      return computedHash.toString('hex') === hash;

    } catch (error) {
      logger.error('哈希验证失败', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 加密对象中的敏感字段
   */
  encryptObject(obj, fieldType = 'system') {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const encrypted = { ...obj };
    const sensitiveFields = ENCRYPTED_FIELDS[fieldType] || [];

    // 批量加密敏感字段
    for (const field of sensitiveFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        const key = this.getDataKey(fieldType);
        encrypted[field] = this.aesEncrypt(encrypted[field], key);
        encrypted[`${field}_encrypted`] = true;
      }
    }

    return encrypted;
  }

  /**
   * 解密对象中的敏感字段
   */
  decryptObject(obj, fieldType = 'system') {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const decrypted = { ...obj };
    const sensitiveFields = ENCRYPTED_FIELDS[fieldType] || [];

    // 批量解密敏感字段
    for (const field of sensitiveFields) {
      if (decrypted[`${field}_encrypted`] && decrypted[field]) {
        try {
          const key = this.getDataKey(fieldType);
          decrypted[field] = this.aesDecrypt(decrypted[field], key);
          delete decrypted[`${field}_encrypted`];
        } catch (error) {
          logger.error('字段解密失败', {
            field,
            error: error.message
          });
        }
      }
    }

    return decrypted;
  }

  /**
   * 数据库字段加密中间件
   */
  createDatabaseEncryptionMiddleware() {
    return {
      beforeSave: (model, fieldType) => {
        if (model && typeof model === 'object') {
          return this.encryptObject(model, fieldType);
        }
        return model;
      },

      afterFind: (data, fieldType) => {
        if (Array.isArray(data)) {
          return data.map(item => this.decryptObject(item, fieldType));
        } else if (data && typeof data === 'object') {
          return this.decryptObject(data, fieldType);
        }
        return data;
      }
    };
  }

  /**
   * 生成数字签名
   */
  sign(data, privateKey) {
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(JSON.stringify(data));

      const signature = sign.sign(privateKey, 'hex');

      return {
        algorithm: 'RSA-SHA256',
        signature,
        data
      };

    } catch (error) {
      logger.error('数字签名生成失败', {
        error: error.message
      });
      throw new Error('数字签名生成失败');
    }
  }

  /**
   * 验证数字签名
   */
  verify(signatureData, publicKey) {
    try {
      const { algorithm, signature, data } = signatureData;

      const verify = crypto.createVerify(algorithm);
      verify.update(JSON.stringify(data));

      return verify.verify(publicKey, signature, 'hex');

    } catch (error) {
      logger.error('数字签名验证失败', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 密钥轮转
   */
  rotateKeys() {
    try {
      logger.info('开始密钥轮转...');

      // 重新生成数据密钥
      this.initializeDataKeys();

      // 更新轮转时间
      this.lastKeyRotation = Date.now();

      logger.info('密钥轮转完成', {
        rotationTime: new Date(this.lastKeyRotation).toISOString()
      });

      return true;

    } catch (error) {
      logger.error('密钥轮转失败', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 启动密钥轮转定时器
   */
  startKeyRotation() {
    // 临时禁用密钥轮转以避免无限循环
    logger.info('密钥轮转已禁用（开发模式）');

    // 原代码：
    // setInterval(() => {
    //   this.rotateKeys();
    // }, this.keyRotationInterval);

    // logger.info('密钥轮转定时器已启动', {
    //   interval: this.keyRotationInterval / (24 * 60 * 60 * 1000), // 天数
    //   nextRotation: new Date(Date.now() + this.keyRotationInterval).toISOString()
    // });
  }

  /**
   * 获取加密状态信息
   */
  getEncryptionStatus() {
    return {
      masterKeyConfigured: !!process.env.ENCRYPTION_MASTER_KEY,
      dataKeysCount: this.dataKeys.size,
      lastKeyRotation: new Date(this.lastKeyRotation).toISOString(),
      nextRotation: new Date(this.lastKeyRotation + this.keyRotationInterval).toISOString(),
      supportedAlgorithms: {
        aes: ENCRYPTION_CONFIG.AES.algorithm,
        rsa: ENCRYPTION_CONFIG.RSA.algorithm,
        hash: ENCRYPTION_CONFIG.HASH.algorithm
      }
    };
  }

  /**
   * 安全清理内存
   */
  secureClear() {
    try {
      // 清理主密钥（从内存中）
      if (this.masterKey) {
        this.masterKey.fill(0);
      }

      // 清理数据密钥缓存
      for (const [key, value] of this.dataKeys) {
        value.fill(0);
      }
      this.dataKeys.clear();

      logger.info('加密服务内存已安全清理');

    } catch (error) {
      logger.error('内存安全清理失败', {
        error: error.message
      });
    }
  }
}

// 创建全局加密服务实例
const encryptionService = new EncryptionService();

// 优雅关闭时清理内存
process.on('SIGTERM', () => {
  encryptionService.secureClear();
});

process.on('SIGINT', () => {
  encryptionService.secureClear();
});

module.exports = {
  encryptionService,
  ENCRYPTION_CONFIG,
  ENCRYPTED_FIELDS
};