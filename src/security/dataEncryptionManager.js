const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * 数据加密管理器
 * 提供AES加密、密钥轮换、敏感字段保护等功能
 */
class DataEncryptionManager {
  constructor() {
    this.config = {
      // 加密算法
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,

      // 密钥轮换配置
      keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30天
      maxKeyVersions: 5,
      keyDerivationRounds: 100000,

      // 密钥存储
      keyFile: path.join(__dirname, '../../config/encryption-keys.json'),
      masterKeyEnv: 'ENCRYPTION_MASTER_KEY',

      // 敏感字段配置
      sensitiveFields: [
        'idCard',
        'idNumber',
        'phoneNumber',
        'bankAccount',
        'creditCard',
        'password',
        'secret',
        'token',
        'privateKey',
        'certificate',
        'medicalRecord',
        'biometricData'
      ],

      // 字段级加密配置
      fieldEncryption: {
        strong: ['idCard', 'bankAccount', 'creditCard', 'medicalRecord'],
        medium: ['phoneNumber', 'email', 'address'],
        weak: ['name', 'company', 'organization']
      },

      // 缓存配置
      keyCache: new Map(),
      cacheTimeout: 300000 // 5分钟
    };

    // 当前密钥版本
    this.currentKeyVersion = 1;
    this.keys = new Map();

    // 初始化
    this.initialize();
  }

  /**
   * 初始化加密管理器
   */
  async initialize() {
    try {
      await this.loadEncryptionKeys();
      console.log('✅ 数据加密管理器初始化完成');

      // 检查是否需要密钥轮换
      await this.checkKeyRotation();

      // 启动密钥清理任务
      this.startKeyCleanupTask();

    } catch (error) {
      console.error('❌ 数据加密管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载加密密钥
   */
  async loadEncryptionKeys() {
    try {
      const keyData = await fs.readFile(this.config.keyFile, 'utf8');
      const encryptionConfig = JSON.parse(keyData);

      // 验证主密钥
      const masterKey = this.getMasterKey();
      if (!masterKey) {
        throw new Error('主密钥未设置');
      }

      // 解密并加载密钥
      for (const [version, encryptedKey] of Object.entries(encryptionConfig.keys)) {
        const decryptedKey = this.decryptKey(encryptedKey, masterKey);
        this.keys.set(parseInt(version), {
          key: decryptedKey,
          createdAt: new Date(encryptedKey.createdAt),
          version: parseInt(version)
        });
      }

      this.currentKeyVersion = encryptionConfig.currentVersion;

      console.log(`📖 加载了 ${this.keys.size} 个加密密钥，当前版本: ${this.currentKeyVersion}`);

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️ 加密密钥文件不存在，生成新密钥');
        await this.generateInitialKeys();
      } else {
        throw error;
      }
    }
  }

  /**
   * 生成初始密钥
   */
  async generateInitialKeys() {
    const masterKey = this.getMasterKey();
    if (!masterKey) {
      throw new Error('无法生成密钥：主密钥未设置');
    }

    // 生成初始加密密钥
    const key = crypto.randomBytes(this.config.keyLength);
    const encryptedKey = this.encryptKey(key, masterKey);

    const keyConfig = {
      currentVersion: 1,
      keys: {
        1: {
          encryptedKey: encryptedKey.toString('base64'),
          createdAt: new Date().toISOString(),
          algorithm: this.config.algorithm
        }
      }
    };

    // 保存密钥配置
    await this.saveKeyConfig(keyConfig);

    // 加载到内存
    this.keys.set(1, {
      key,
      createdAt: new Date(),
      version: 1
    });

    this.currentKeyVersion = 1;

    console.log('🔑 生成了新的加密密钥');
  }

  /**
   * 获取主密钥
   */
  getMasterKey() {
    // 优先从环境变量获取
    const envKey = process.env[this.config.masterKeyEnv];
    if (envKey) {
      return Buffer.from(envKey, 'base64');
    }

    // 从密钥文件获取
    try {
      const keyFile = path.join(__dirname, '../../config/master.key');
      const key = require('fs').readFileSync(keyFile);
      return key;
    } catch (error) {
      console.error('无法获取主密钥，请设置环境变量或密钥文件');
      return null;
    }
  }

  /**
   * 加密密钥
   */
  encryptKey(key, masterKey) {
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipher(this.config.algorithm, masterKey);
    cipher.setAAD(Buffer.from('encryption-key'));

    let encrypted = cipher.update(key);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * 解密密钥
   */
  decryptKey(encryptedData, masterKey) {
    const data = Buffer.from(encryptedData.encryptedKey, 'base64');
    const iv = data.slice(0, this.config.ivLength);
    const tag = data.slice(this.config.ivLength, this.config.ivLength + this.config.tagLength);
    const encrypted = data.slice(this.config.ivLength + this.config.tagLength);

    const decipher = crypto.createDecipher(this.config.algorithm, masterKey);
    decipher.setAAD(Buffer.from('encryption-key'));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  /**
   * 加密数据
   */
  encrypt(data, options = {}) {
    try {
      const keyVersion = options.keyVersion || this.currentKeyVersion;
      const keyInfo = this.keys.get(keyVersion);

      if (!keyInfo) {
        throw new Error(`密钥版本 ${keyVersion} 不存在`);
      }

      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipher(this.config.algorithm, keyInfo.key);
      cipher.setAAD(Buffer.from(`version:${keyVersion}`));

      let encrypted;
      if (typeof data === 'string') {
        encrypted = cipher.update(data, 'utf8', 'base64');
      } else {
        encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
      }

      encrypted += cipher.final('base64');

      const tag = cipher.getAuthTag();

      const result = {
        encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.config.algorithm,
        keyVersion,
        timestamp: new Date().toISOString()
      };

      return result;

    } catch (error) {
      throw new Error(`数据加密失败: ${error.message}`);
    }
  }

  /**
   * 解密数据
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag, algorithm, keyVersion } = encryptedData;

      // 验证算法
      if (algorithm !== this.config.algorithm) {
        throw new Error(`不支持的加密算法: ${algorithm}`);
      }

      // 获取对应版本的密钥
      const keyInfo = this.keys.get(keyVersion);
      if (!keyInfo) {
        throw new Error(`密钥版本 ${keyVersion} 不存在或已被轮换`);
      }

      const decipher = crypto.createDecipher(this.config.algorithm, keyInfo.key);
      decipher.setAAD(Buffer.from(`version:${keyVersion}`));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // 尝试解析JSON，如果失败则返回原始字符串
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }

    } catch (error) {
      throw new Error(`数据解密失败: ${error.message}`);
    }
  }

  /**
   * 加密字段
   */
  encryptField(fieldName, value, options = {}) {
    // 检查是否为敏感字段
    const fieldLevel = this.getFieldEncryptionLevel(fieldName);
    if (fieldLevel === 'none') {
      return value;
    }

    // 确定加密强度
    let strongEncryption = options.strong || false;
    if (this.config.fieldEncryption.strong.includes(fieldName)) {
      strongEncryption = true;
    }

    // 构建加密配置
    const encryptionOptions = {
      ...options,
      strongEncryption,
      fieldLevel,
      fieldName
    };

    // 执行加密
    const encrypted = this.encrypt(value, encryptionOptions);

    // 添加字段级元数据
    return {
      ...encrypted,
      field: fieldName,
      fieldLevel,
      encryptedAt: new Date().toISOString()
    };
  }

  /**
   * 解密字段
   */
  decryptField(encryptedField) {
    // 如果不是加密字段，直接返回
    if (!encryptedField || typeof encryptedField !== 'object' || !encryptedField.encrypted) {
      return encryptedField;
    }

    try {
      const decrypted = this.decrypt(encryptedField);

      // 记录解密日志（用于审计）
      this.logDecryption(encryptedField.field, encryptedField.keyVersion);

      return decrypted;

    } catch (error) {
      console.error(`解密字段 ${encryptedField.field} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量加密对象字段
   */
  encryptObjectFields(obj, fieldMappings = {}) {
    const result = { ...obj };

    for (const [fieldName, fieldConfig] of Object.entries(fieldMappings)) {
      if (result[fieldName] !== undefined && result[fieldName] !== null) {
        try {
          result[fieldName] = this.encryptField(
            fieldName,
            result[fieldName],
            fieldConfig
          );
        } catch (error) {
          console.error(`加密字段 ${fieldName} 失败:`, error);
          // 加密失败时保留原值，但记录错误
          result[`${fieldName  }_encryption_error`] = error.message;
        }
      }
    }

    return result;
  }

  /**
   * 批量解密对象字段
   */
  decryptObjectFields(obj, fieldMappings = {}) {
    const result = { ...obj };

    for (const [fieldName] of Object.entries(fieldMappings)) {
      if (result[fieldName] !== undefined && result[fieldName] !== null) {
        try {
          result[fieldName] = this.decryptField(result[fieldName]);
        } catch (error) {
          console.error(`解密字段 ${fieldName} 失败:`, error);
          // 解密失败时保留加密值
        }
      }
    }

    return result;
  }

  /**
   * 获取字段加密级别
   */
  getFieldEncryptionLevel(fieldName) {
    // 检查强加密字段
    if (this.config.fieldEncryption.strong.includes(fieldName)) {
      return 'strong';
    }

    // 检查中等加密字段
    if (this.config.fieldEncryption.medium.includes(fieldName)) {
      return 'medium';
    }

    // 检查弱加密字段
    if (this.config.fieldEncryption.weak.includes(fieldName)) {
      return 'weak';
    }

    // 检查通用敏感字段
    if (this.config.sensitiveFields.some(field =>
      fieldName.toLowerCase().includes(field.toLowerCase()))) {
      return 'medium';
    }

    return 'none';
  }

  /**
   * 密钥轮换
   */
  async rotateKeys() {
    try {
      console.log('🔄 开始执行密钥轮换...');

      const masterKey = this.getMasterKey();
      if (!masterKey) {
        throw new Error('无法执行密钥轮换：主密钥未设置');
      }

      // 生成新密钥
      const newKey = crypto.randomBytes(this.config.keyLength);
      const newVersion = this.currentKeyVersion + 1;
      const encryptedNewKey = this.encryptKey(newKey, masterKey);

      // 保存新密钥
      this.keys.set(newVersion, {
        key: newKey,
        createdAt: new Date(),
        version: newVersion
      });

      // 更新配置文件
      const keyConfig = await this.loadKeyConfig();
      keyConfig.keys[newVersion.toString()] = {
        encryptedKey: encryptedNewKey.toString('base64'),
        createdAt: new Date().toISOString(),
        algorithm: this.config.algorithm
      };
      keyConfig.currentVersion = newVersion;

      await this.saveKeyConfig(keyConfig);

      // 更新当前版本
      this.currentKeyVersion = newVersion;

      // 清理旧密钥
      await this.cleanupOldKeys();

      console.log(`✅ 密钥轮换完成，新版本: ${newVersion}`);

      return {
        newVersion,
        previousVersion: newVersion - 1,
        rotatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 密钥轮换失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否需要密钥轮换
   */
  async checkKeyRotation() {
    try {
      const currentKey = this.keys.get(this.currentKeyVersion);
      if (!currentKey) {
        return;
      }

      const now = Date.now();
      const keyAge = now - currentKey.createdAt.getTime();

      if (keyAge >= this.config.keyRotationInterval) {
        console.log('🔑 检测到密钥需要轮换');
        await this.rotateKeys();
      }

    } catch (error) {
      console.error('检查密钥轮换时出错:', error);
    }
  }

  /**
   * 清理旧密钥
   */
  async cleanupOldKeys() {
    try {
      const sortedVersions = Array.from(this.keys.keys()).sort((a, b) => b - a);

      // 保留最新的 maxKeyVersions 个密钥
      if (sortedVersions.length > this.config.maxKeyVersions) {
        const versionsToRemove = sortedVersions.slice(this.config.maxKeyVersions);

        for (const version of versionsToRemove) {
          this.keys.delete(version);
          console.log(`🗑️ 清理了旧密钥版本: ${version}`);
        }

        // 更新配置文件
        const keyConfig = await this.loadKeyConfig();
        for (const version of versionsToRemove) {
          delete keyConfig.keys[version.toString()];
        }
        await this.saveKeyConfig(keyConfig);
      }

    } catch (error) {
      console.error('清理旧密钥时出错:', error);
    }
  }

  /**
   * 重新加密数据（用于密钥轮换后）
   */
  async reencryptData(oldEncryptedData) {
    try {
      // 使用旧密钥解密
      const decrypted = this.decrypt(oldEncryptedData);

      // 使用当前密钥加密
      const reencrypted = this.encrypt(decrypted);

      return reencrypted;

    } catch (error) {
      throw new Error(`重新加密数据失败: ${error.message}`);
    }
  }

  /**
   * 生成哈希
   */
  generateHash(data, algorithm = 'sha256', salt = null) {
    try {
      const hash = crypto.createHash(algorithm);

      if (salt) {
        hash.update(salt);
      }

      if (typeof data === 'object') {
        hash.update(JSON.stringify(data));
      } else {
        hash.update(data.toString());
      }

      return hash.digest('hex');

    } catch (error) {
      throw new Error(`生成哈希失败: ${error.message}`);
    }
  }

  /**
   * 生成密码哈希（使用PBKDF2）
   */
  generatePasswordHash(password, salt = null) {
    try {
      const keySalt = salt || crypto.randomBytes(16);
      const hash = crypto.pbkdf2Sync(
        password,
        keySalt,
        this.config.keyDerivationRounds,
        this.config.keyLength,
        'sha256'
      );

      return {
        hash: hash.toString('hex'),
        salt: keySalt.toString('hex'),
        rounds: this.config.keyDerivationRounds,
        algorithm: 'pbkdf2-sha256'
      };

    } catch (error) {
      throw new Error(`生成密码哈希失败: ${error.message}`);
    }
  }

  /**
   * 验证密码哈希
   */
  verifyPasswordHash(password, hashData) {
    try {
      const { hash, salt, rounds, algorithm } = hashData;
      const expectedHash = crypto.pbkdf2Sync(
        password,
        Buffer.from(salt, 'hex'),
        rounds,
        this.config.keyLength,
        algorithm.replace('-', '')
      );

      return hash === expectedHash.toString('hex');

    } catch (error) {
      throw new Error(`验证密码哈希失败: ${error.message}`);
    }
  }

  /**
   * 加密敏感字段映射配置
   */
  getSensitiveFieldMappings(modelName) {
    const mappings = {
      User: {
        idNumber: { strong: true },
        phoneNumber: { strong: false },
        email: { strong: false },
        bankAccount: { strong: true },
        password: { strong: true }
      },
      ResidentProfile: {
        idCard: { strong: true },
        phoneNumber: { strong: false },
        medicalRecord: { strong: true },
        biometricData: { strong: true }
      },
      FamilyProxyRelation: {
        documents: { strong: true },
        contactInfo: { strong: false }
      },
      ApplicationHistory: {
        financialData: { strong: true },
        personalInfo: { strong: false }
      }
    };

    return mappings[modelName] || {};
  }

  /**
   * 记录解密日志
   */
  logDecryption(fieldName, keyVersion) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'decrypt',
      field: fieldName,
      keyVersion,
      source: 'system'
    };

    // 这里可以集成审计日志系统
    console.debug('字段解密日志:', logEntry);
  }

  /**
   * 获取加密统计信息
   */
  getStats() {
    return {
      currentKeyVersion: this.currentKeyVersion,
      totalKeys: this.keys.size,
      maxKeyVersions: this.config.maxKeyVersions,
      keyRotationInterval: this.config.keyRotationInterval,
      supportedFields: this.config.sensitiveFields.length,
      fieldLevels: {
        strong: this.config.fieldEncryption.strong.length,
        medium: this.config.fieldEncryption.medium.length,
        weak: this.config.fieldEncryption.weak.length
      }
    };
  }

  /**
   * 加载密钥配置
   */
  async loadKeyConfig() {
    const data = await fs.readFile(this.config.keyFile, 'utf8');
    return JSON.parse(data);
  }

  /**
   * 保存密钥配置
   */
  async saveKeyConfig(config) {
    await fs.writeFile(
      this.config.keyFile,
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * 启动密钥清理任务
   */
  startKeyCleanupTask() {
    // 每天检查一次
    setInterval(async () => {
      await this.checkKeyRotation();
      await this.cleanupOldKeys();
    }, 24 * 60 * 60 * 1000);
  }
}

module.exports = new DataEncryptionManager();