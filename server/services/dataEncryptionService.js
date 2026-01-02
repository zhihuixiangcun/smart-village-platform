/**
 * 数据加密服务
 * 提供AES、RSA加密解密、密钥管理等功能
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DataEncryptionService {
  constructor() {
    // 加密算法配置
    this.config = {
      // AES配置
      aes: {
        algorithm: 'aes-256-gcm',
        keyLength: 32, // 256位
        ivLength: 16,  // 128位
        tagLength: 16  // 128位认证标签
      },
      // RSA配置
      rsa: {
        modulusLength: 2048,
        algorithm: 'rsa-oaep',
        hashAlgorithm: 'sha256'
      },
      // 哈希配置
      hash: {
        algorithm: 'sha256'
      }
    };

    // 密钥存储路径
    this.keysPath = path.join(__dirname, '../../config/encryption_keys');

    // 密钥缓存
    this.keysCache = {
      aes: null,
      rsaPublic: null,
      rsaPrivate: null
    };

    // 初始化
    this.initialize();
  }

  /**
   * 初始化加密服务
   */
  async initialize() {
    try {
      // 确保密钥目录存在
      await this.ensureKeysDirectory();

      // 加载或生成密钥
      await this.loadOrGenerateKeys();

      console.log('Data encryption service initialized successfully');
    } catch (error) {
      console.error('Error initializing data encryption service:', error);
    }
  }

  /**
   * 确保密钥目录存在
   */
  async ensureKeysDirectory() {
    try {
      await fs.access(this.keysPath);
    } catch {
      await fs.mkdir(this.keysPath, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 加载或生成密钥
   */
  async loadOrGenerateKeys() {
    try {
      // 尝试加载现有密钥
      const aesKeyPath = path.join(this.keysPath, 'aes_key.txt');
      const rsaPublicKeyPath = path.join(this.keysPath, 'rsa_public.pem');
      const rsaPrivateKeyPath = path.join(this.keysPath, 'rsa_private.pem');

      // 检查密钥文件是否存在
      const aesExists = await this.fileExists(aesKeyPath);
      const rsaPublicExists = await this.fileExists(rsaPublicKeyPath);
      const rsaPrivateExists = await this.fileExists(rsaPrivateKeyPath);

      if (aesExists && rsaPublicExists && rsaPrivateExists) {
        // 加载现有密钥
        this.keysCache.aes = await fs.readFile(aesKeyPath, 'utf8');
        this.keysCache.rsaPublic = await fs.readFile(rsaPublicKeyPath, 'utf8');
        this.keysCache.rsaPrivate = await fs.readFile(rsaPrivateKeyPath, 'utf8');
      } else {
        // 生成新密钥
        await this.generateKeys();
      }
    } catch (error) {
      console.error('Error loading or generating keys:', error);
      // 生成新密钥作为后备
      await this.generateKeys();
    }
  }

  /**
   * 生成新密钥
   */
  async generateKeys() {
    try {
      // 生成AES密钥
      const aesKey = crypto.randomBytes(this.config.aes.keyLength);
      const aesKeyHex = aesKey.toString('hex');

      // 生成RSA密钥对
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.config.rsa.modulusLength,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // 保存密钥到文件
      await fs.writeFile(path.join(this.keysPath, 'aes_key.txt'), aesKeyHex, { mode: 0o600 });
      await fs.writeFile(path.join(this.keysPath, 'rsa_public.pem'), publicKey, { mode: 0o644 });
      await fs.writeFile(path.join(this.keysPath, 'rsa_private.pem'), privateKey, { mode: 0o600 });

      // 缓存密钥
      this.keysCache.aes = aesKeyHex;
      this.keysCache.rsaPublic = publicKey;
      this.keysCache.rsaPrivate = privateKey;

      console.log('New encryption keys generated successfully');
    } catch (error) {
      console.error('Error generating keys:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param {String} filePath - 文件路径
   * @returns {Boolean} 文件是否存在
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * AES加密
   * @param {String|Buffer} plaintext - 明文
   * @param {String} keyHex - 密钥（hex格式），如果不提供则使用默认密钥
   * @returns {Object} 加密结果（包含iv、tag、ciphertext）
   */
  aesEncrypt(plaintext, keyHex = null) {
    try {
      const key = keyHex
        ? Buffer.from(keyHex, 'hex')
        : Buffer.from(this.keysCache.aes, 'hex');

      const iv = crypto.randomBytes(this.config.aes.ivLength);
      const cipher = crypto.createCipheriv(this.config.aes.algorithm, key, iv);

      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        algorithm: this.config.aes.algorithm,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        ciphertext,
        encoding: 'hex'
      };
    } catch (error) {
      console.error('AES encryption error:', error);
      throw new Error('AES加密失败');
    }
  }

  /**
   * AES解密
   * @param {Object} encryptedData - 加密数据
   * @param {String} keyHex - 密钥（hex格式），如果不提供则使用默认密钥
   * @returns {String} 明文
   */
  aesDecrypt(encryptedData, keyHex = null) {
    try {
      const { iv, tag, ciphertext } = encryptedData;

      const key = keyHex
        ? Buffer.from(keyHex, 'hex')
        : Buffer.from(this.keysCache.aes, 'hex');

      const decipher = crypto.createDecipheriv(
        this.config.aes.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      console.error('AES decryption error:', error);
      throw new Error('AES解密失败');
    }
  }

  /**
   * RSA公钥加密
   * @param {String|Buffer} plaintext - 明文
   * @param {String} publicKey - 公钥（PEM格式）
   * @returns {String} 密文（base64格式）
   */
  rsaPublicEncrypt(plaintext, publicKey = null) {
    try {
      const key = publicKey || this.keysCache.rsaPublic;

      const buffer = Buffer.from(plaintext, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: this.config.rsa.hashAlgorithm
        },
        buffer
      );

      return encrypted.toString('base64');
    } catch (error) {
      console.error('RSA public encryption error:', error);
      throw new Error('RSA公钥加密失败');
    }
  }

  /**
   * RSA私钥解密
   * @param {String} ciphertext - 密文（base64格式）
   * @param {String} privateKey - 私钥（PEM格式）
   * @returns {String} 明文
   */
  rsaPrivateDecrypt(ciphertext, privateKey = null) {
    try {
      const key = privateKey || this.keysCache.rsaPrivate;

      const buffer = Buffer.from(ciphertext, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: this.config.rsa.hashAlgorithm
        },
        buffer
      );

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('RSA private decryption error:', error);
      throw new Error('RSA私钥解密失败');
    }
  }

  /**
   * 混合加密（RSA加密AES密钥，AES加密数据）
   * @param {String|Buffer} plaintext - 明文
   * @returns {Object} 加密结果
   */
  hybridEncrypt(plaintext) {
    try {
      // 生成临时AES密钥
      const tempAesKey = crypto.randomBytes(this.config.aes.keyLength);
      const tempAesKeyHex = tempAesKey.toString('hex');

      // 使用AES加密数据
      const encryptedData = this.aesEncrypt(plaintext, tempAesKeyHex);

      // 使用RSA公钥加密AES密钥
      const encryptedKey = this.rsaPublicEncrypt(tempAesKeyHex);

      return {
        encryptedKey,
        encryptedData,
        algorithm: 'hybrid',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Hybrid encryption error:', error);
      throw new Error('混合加密失败');
    }
  }

  /**
   * 混合解密
   * @param {Object} encryptedPackage - 加密包
   * @returns {String} 明文
   */
  hybridDecrypt(encryptedPackage) {
    try {
      const { encryptedKey, encryptedData } = encryptedPackage;

      // 使用RSA私钥解密AES密钥
      const tempAesKeyHex = this.rsaPrivateDecrypt(encryptedKey);

      // 使用AES密钥解密数据
      const plaintext = this.aesDecrypt(encryptedData, tempAesKeyHex);

      return plaintext;
    } catch (error) {
      console.error('Hybrid decryption error:', error);
      throw new Error('混合解密失败');
    }
  }

  /**
   * 计算哈希值
   * @param {String|Buffer} data - 数据
   * @param {String} algorithm - 哈希算法
   * @returns {String} 哈希值（hex格式）
   */
  calculateHash(data, algorithm = null) {
    const algo = algorithm || this.config.hash.algorithm;
    const hash = crypto.createHash(algo);
    hash.update(typeof data === 'string' ? data : JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * 计算文件哈希
   * @param {String} filePath - 文件路径
   * @param {String} algorithm - 哈希算法
   * @returns {String} 哈希值
   */
  async calculateFileHash(filePath, algorithm = null) {
    try {
      const algo = algorithm || this.config.hash.algorithm;
      const hash = crypto.createHash(algo);
      const stream = require('fs').createReadStream(filePath);

      return new Promise((resolve, reject) => {
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error calculating file hash:', error);
      throw new Error('文件哈希计算失败');
    }
  }

  /**
   * HMAC签名
   * @param {String|Buffer} data - 数据
   * @param {String} key - 密钥
   * @param {String} algorithm - 算法
   * @returns {String} 签名（hex格式）
   */
  hmacSign(data, key, algorithm = 'sha256') {
    const hmac = crypto.createHmac(algorithm, key);
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data));
    return hmac.digest('hex');
  }

  /**
   * 验证HMAC签名
   * @param {String|Buffer} data - 数据
   * @param {String} signature - 签名
   * @param {String} key - 密钥
   * @param {String} algorithm - 算法
   * @returns {Boolean} 是否有效
   */
  verifyHmac(data, signature, key, algorithm = 'sha256') {
    const calculatedSignature = this.hmacSign(data, key, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }

  /**
   * 生成随机密钥
   * @param {Number} length - 密钥长度（字节）
   * @returns {String} 密钥（hex格式）
   */
  generateRandomKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成随机盐值
   * @param {Number} length - 盐值长度（字节）
   * @returns {String} 盐值（hex格式）
   */
  generateSalt(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 密钥派生（PBKDF2）
   * @param {String} password - 密码
   * @param {String} salt - 盐值
   * @param {Number} iterations - 迭代次数
   * @param {Number} keyLength - 密钥长度
   * @param {String} digest - 摘要算法
   * @returns {String} 派生密钥
   */
  deriveKey(password, salt, iterations = 100000, keyLength = 32, digest = 'sha256') {
    return crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('hex');
  }

  /**
   * 密钥轮换
   * @returns {Object} 轮换结果
   */
  async rotateKeys() {
    try {
      // 备份旧密钥
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.keysPath, `backup_${timestamp}`);

      await fs.mkdir(backupPath, { recursive: true, mode: 0o700 });

      await fs.copyFile(
        path.join(this.keysPath, 'aes_key.txt'),
        path.join(backupPath, 'aes_key.txt')
      );
      await fs.copyFile(
        path.join(this.keysPath, 'rsa_public.pem'),
        path.join(backupPath, 'rsa_public.pem')
      );
      await fs.copyFile(
        path.join(this.keysPath, 'rsa_private.pem'),
        path.join(backupPath, 'rsa_private.pem')
      );

      // 生成新密钥
      await this.generateKeys();

      return {
        success: true,
        message: '密钥轮换成功',
        backupPath,
        timestamp
      };
    } catch (error) {
      console.error('Key rotation error:', error);
      return {
        success: false,
        message: '密钥轮换失败',
        error: error.message
      };
    }
  }

  /**
   * 获取加密统计信息
   * @returns {Object} 统计信息
   */
  async getStats() {
    try {
      const aesKeyPath = path.join(this.keysPath, 'aes_key.txt');
      const stats = await fs.stat(aesKeyPath);

      return {
        algorithm: {
          aes: this.config.aes.algorithm,
          rsa: this.config.rsa.algorithm,
          hash: this.config.hash.algorithm
        },
        keyInfo: {
          keyLength: this.config.aes.keyLength * 8, // 转换为比特
          lastRotated: stats.mtime,
          keyPath: this.keysPath
        },
        status: 'active'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 验证数据完整性
   * @param {String|Buffer} data - 数据
   * @param {String} expectedHash - 预期哈希值
   * @param {String} algorithm - 哈希算法
   * @returns {Boolean} 是否匹配
   */
  verifyIntegrity(data, expectedHash, algorithm = null) {
    const calculatedHash = this.calculateHash(data, algorithm);
    return calculatedHash === expectedHash;
  }

  /**
   * 安全擦除缓冲区
   * @param {Buffer} buffer - 要擦除的缓冲区
   */
  secureWipe(buffer) {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }

  /**
   * 生成加密配置
   * @returns {Object} 加密配置
   */
  getEncryptionConfig() {
    return {
      aes: {
        algorithm: this.config.aes.algorithm,
        keyLength: this.config.aes.keyLength * 8
      },
      rsa: {
        modulusLength: this.config.rsa.modulusLength,
        algorithm: this.config.rsa.algorithm
      },
      hash: {
        algorithm: this.config.hash.algorithm
      }
    };
  }
}

// 导出单例
module.exports = new DataEncryptionService();
