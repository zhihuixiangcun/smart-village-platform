/**
 * 数据加密传输存储服务
 * 支持国密算法和AES加密
 */

const crypto = require('crypto');
const NodeRSA = require('node-rsa');

class EncryptionService {
  constructor() {
    // 加密算法配置
    this.algorithms = {
      // 对称加密
      symmetric: {
        AES_256_GCM: {
          name: 'AES-256-GCM',
          keyLength: 32,
          ivLength: 12,
          tagLength: 16,
          description: 'AES-256 GCM模式，支持认证加密'
        },
        SM4_GCM: {
          name: 'SM4-GCM',
          keyLength: 16,
          ivLength: 12,
          tagLength: 16,
          description: '国密SM4 GCM模式'
        },
        AES_256_CBC: {
          name: 'AES-256-CBC',
          keyLength: 32,
          ivLength: 16,
          description: 'AES-256 CBC模式'
        }
      },
      // 非对称加密
      asymmetric: {
        RSA_2048: {
          name: 'RSA-2048',
          keySize: 2048,
          description: 'RSA 2048位'
        },
        RSA_3072: {
          name: 'RSA-3072',
          keySize: 3072,
          description: 'RSA 3072位'
        },
        SM2: {
          name: 'SM2',
          curveName: 'curve25519',
          description: '国密SM2椭圆曲线'
        }
      },
      // 哈希算法
      hash: {
        SHA256: { name: 'SHA-256', outputLength: 32 },
        SHA384: { name: 'SHA-384', outputLength: 48 },
        SHA512: { name: 'SHA-512', outputLength: 64 },
        SM3: { name: 'SM3', outputLength: 32 }
      }
    };

    // 默认加密配置
    this.defaultConfig = {
      symmetric: this.algorithms.symmetric.AES_256_GCM,
      asymmetric: this.algorithms.asymmetric.RSA_2048,
      hash: this.algorithms.hash.SHA256
    };

    // 密钥管理
    this.keyStore = new Map();
    this.initializeKeyStore();

    // 数据分类级别
    this.dataClassification = {
      PUBLIC: { level: 1, description: '公开数据', encryption: false },
      INTERNAL: { level: 2, description: '内部数据', encryption: false },
      CONFIDENTIAL: { level: 3, description: '机密数据', encryption: true },
      SECRET: { level: 4, description: '秘密数据', encryption: true },
      TOP_SECRET: { level: 5, description: '绝密数据', encryption: true }
    };
  }

  /**
   * 初始化密钥存储
   */
  async initializeKeyStore() {
    // 生成默认密钥对
    const keyPair = await this.generateKeyPair();
    this.keyStore.set('default_rsa', keyPair);

    // 生成默认对称密钥
    const symmetricKey = await this.generateSymmetricKey();
    this.keyStore.set('default_aes', symmetricKey);

    console.log('加密服务初始化完成');
  }

  /**
   * 生成密钥对
   */
  async generateKeyPair(algorithm = this.defaultConfig.asymmetric) {
    try {
      if (algorithm.name === 'SM2') {
        // 国密SM2密钥对
        const keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp256k1'
        });

        return {
          publicKey: keyPair.publicKey.export({
            type: 'spki',
            format: 'pem'
          }),
          privateKey: keyPair.privateKey.export({
            type: 'pkcs8',
            format: 'pem'
          }),
          algorithm: algorithm.name
        };
      } else {
        // RSA密钥对
        const key = new NodeRSA({ b: algorithm.keySize });

        return {
          publicKey: key.exportKey('public'),
          privateKey: key.exportKey('private'),
          algorithm: algorithm.name
        };
      }
    } catch (error) {
      console.error('生成密钥对失败:', error);
      throw new Error(`密钥对生成失败: ${error.message}`);
    }
  }

  /**
   * 生成对称密钥
   */
  async generateSymmetricKey(algorithm = this.defaultConfig.symmetric) {
    try {
      const key = crypto.randomBytes(algorithm.keyLength);
      return {
        key: key,
        algorithm: algorithm.name,
        keyId: this.generateKeyId()
      };
    } catch (error) {
      console.error('生成对称密钥失败:', error);
      throw new Error(`对称密钥生成失败: ${error.message}`);
    }
  }

  /**
   * 对称加密
   */
  async symmetricEncrypt(data, keyId = 'default_aes', algorithm = null) {
    try {
      const keyInfo = this.keyStore.get(keyId);
      if (!keyInfo) {
        throw new Error(`密钥不存在: ${keyId}`);
      }

      const algo = algorithm || this.algorithms.symmetric[keyInfo.algorithm] || this.defaultConfig.symmetric;
      const iv = crypto.randomBytes(algo.ivLength);
      const cipher = crypto.createCipher(algo.name, keyInfo.key);

      if (algo.name.includes('GCM')) {
        // GCM模式
        const cipherGCM = crypto.createCipherGCM(algo.name, keyInfo.key, iv);
        let encrypted = cipherGCM.update(data, 'utf8', 'hex');
        encrypted += cipherGCM.final('hex');

        const tag = cipherGCM.getAuthTag();

        return {
          algorithm: algo.name,
          iv: iv.toString('hex'),
          encrypted: encrypted,
          tag: tag.toString('hex'),
          keyId: keyId
        };
      } else if (algo.name.includes('CBC')) {
        // CBC模式
        cipher.setAutoPadding(true);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
          algorithm: algo.name,
          iv: iv.toString('hex'),
          encrypted: encrypted,
          keyId: keyId
        };
      } else {
        // 其他模式
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
          algorithm: algo.name,
          encrypted: encrypted,
          keyId: keyId
        };
      }
    } catch (error) {
      console.error('对称加密失败:', error);
      throw new Error(`对称加密失败: ${error.message}`);
    }
  }

  /**
   * 对称解密
   */
  async symmetricDecrypt(encryptedData, keyId = null) {
    try {
      const keyInfo = this.keyStore.get(encryptedData.keyId || keyId || 'default_aes');
      if (!keyInfo) {
        throw new Error(`解密密钥不存在`);
      }

      const algo = this.algorithms.symmetric[encryptedData.algorithm] || this.defaultConfig.symmetric;

      if (encryptedData.algorithm.includes('GCM')) {
        // GCM模式解密
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const tag = Buffer.from(encryptedData.tag, 'hex');
        const decipherGCM = crypto.createDecipherGCM(encryptedData.algorithm, keyInfo.key, iv);
        decipherGCM.setAuthTag(tag);

        let decrypted = decipherGCM.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipherGCM.final('utf8');

        return decrypted;
      } else if (encryptedData.algorithm.includes('CBC')) {
        // CBC模式解密
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipher(encryptedData.algorithm, keyInfo.key);
        decipher.setAutoPadding(true);

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      } else {
        // 其他模式解密
        const decipher = crypto.createDecipher(encryptedData.algorithm, keyInfo.key);
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      }
    } catch (error) {
      console.error('对称解密失败:', error);
      throw new Error(`对称解密失败: ${error.message}`);
    }
  }

  /**
   * 非对称加密
   */
  async asymmetricEncrypt(data, keyId = 'default_rsa', algorithm = null) {
    try {
      const keyInfo = this.keyStore.get(keyId);
      if (!keyInfo || !keyInfo.publicKey) {
        throw new Error(`公钥不存在: ${keyId}`);
      }

      if (keyInfo.algorithm === 'SM2') {
        // 国密SM2加密
        const publicKey = crypto.createPublicKey(keyInfo.publicKey);
        const encrypted = crypto.publicEncrypt(
          {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'SHA256'
          },
          Buffer.from(data, 'utf8')
        );

        return {
          algorithm: 'SM2',
          encrypted: encrypted.toString('base64'),
          keyId: keyId
        };
      } else {
        // RSA加密
        const key = new NodeRSA(keyInfo.publicKey);
        const encrypted = key.encrypt(data, 'base64');

        return {
          algorithm: keyInfo.algorithm,
          encrypted: encrypted,
          keyId: keyId
        };
      }
    } catch (error) {
      console.error('非对称加密失败:', error);
      throw new Error(`非对称加密失败: ${error.message}`);
    }
  }

  /**
   * 非对称解密
   */
  async asymmetricDecrypt(encryptedData, keyId = null) {
    try {
      const keyInfo = this.keyStore.get(encryptedData.keyId || keyId || 'default_rsa');
      if (!keyInfo || !keyInfo.privateKey) {
        throw new Error(`私钥不存在`);
      }

      if (encryptedData.algorithm === 'SM2') {
        // 国密SM2解密
        const privateKey = crypto.createPrivateKey(keyInfo.privateKey);
        const decrypted = crypto.privateDecrypt(
          {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'SHA256'
          },
          Buffer.from(encryptedData.encrypted, 'base64')
        );

        return decrypted.toString('utf8');
      } else {
        // RSA解密
        const key = new NodeRSA(keyInfo.privateKey);
        const decrypted = key.decrypt(encryptedData.encrypted, 'utf8');

        return decrypted;
      }
    } catch (error) {
      console.error('非对称解密失败:', error);
      throw new Error(`非对称解密失败: ${error.message}`);
    }
  }

  /**
   * 数据哈希
   */
  async hash(data, algorithm = this.defaultConfig.hash) {
    try {
      const hash = crypto.createHash(algorithm.name);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      console.error('哈希计算失败:', error);
      throw new Error(`哈希计算失败: ${error.message}`);
    }
  }

  /**
   * HMAC签名
   */
  async hmacSign(data, keyId = 'default_hmac', algorithm = null) {
    try {
      const keyInfo = this.keyStore.get(keyId);
      if (!keyInfo) {
        // 生成HMAC密钥
        const hmacKey = await this.generateSymmetricKey();
        this.keyStore.set(keyId, hmacKey);
      }

      const hmacKey = this.keyStore.get(keyId).key;
      const algo = algorithm || this.defaultConfig.hash;

      const hmac = crypto.createHmac(algo.name, hmacKey);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      console.error('HMAC签名失败:', error);
      throw new Error(`HMAC签名失败: ${error.message}`);
    }
  }

  /**
   * HMAC验证
   */
  async hmacVerify(data, signature, keyId = 'default_hmac', algorithm = null) {
    try {
      const expectedSignature = await this.hmacSign(data, keyId, algorithm);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('HMAC验证失败:', error);
      throw new Error(`HMAC验证失败: ${error.message}`);
    }
  }

  /**
   * 数字签名
   */
  async digitalSign(data, keyId = 'default_rsa') {
    try {
      const keyInfo = this.keyStore.get(keyId);
      if (!keyInfo || !keyInfo.privateKey) {
        throw new Error(`私钥不存在: ${keyId}`);
      }

      const hash = await this.hash(data);

      if (keyInfo.algorithm === 'SM2') {
        // 国密SM2签名
        const privateKey = crypto.createPrivateKey(keyInfo.privateKey);
        const signature = crypto.sign('SHA256', Buffer.from(hash), privateKey);

        return {
          algorithm: 'SM2',
          signature: signature.toString('base64'),
          hash: hash,
          keyId: keyId
        };
      } else {
        // RSA签名
        const key = new NodeRSA(keyInfo.privateKey);
        const signature = key.sign(hash, 'base64');

        return {
          algorithm: keyInfo.algorithm,
          signature: signature,
          hash: hash,
          keyId: keyId
        };
      }
    } catch (error) {
      console.error('数字签名失败:', error);
      throw new Error(`数字签名失败: ${error.message}`);
    }
  }

  /**
   * 数字签名验证
   */
  async digitalVerify(data, signatureData, keyId = null) {
    try {
      const keyInfo = this.keyStore.get(signatureData.keyId || keyId || 'default_rsa');
      if (!keyInfo || !keyInfo.publicKey) {
        throw new Error(`公钥不存在`);
      }

      // 验证哈希
      const currentHash = await this.hash(data);
      if (currentHash !== signatureData.hash) {
        return false;
      }

      if (signatureData.algorithm === 'SM2') {
        // 国密SM2验证
        const publicKey = crypto.createPublicKey(keyInfo.publicKey);
        const signature = Buffer.from(signatureData.signature, 'base64');

        return crypto.verify(
          'SHA256',
          Buffer.from(currentHash),
          publicKey,
          signature
        );
      } else {
        // RSA验证
        const key = new NodeRSA(keyInfo.publicKey);
        return key.verify(currentHash, signatureData.signature, 'utf8');
      }
    } catch (error) {
      console.error('数字签名验证失败:', error);
      return false;
    }
  }

  /**
   * 数据库字段加密
   */
  async encryptField(data, classification = 'CONFIDENTIAL') {
    try {
      const classificationInfo = this.dataClassification[classification.toUpperCase()];

      if (!classificationInfo || !classificationInfo.encryption) {
        return { encrypted: false, data: data };
      }

      const encrypted = await this.symmetricEncrypt(JSON.stringify(data));

      return {
        encrypted: true,
        data: encrypted,
        classification: classification,
        algorithm: encrypted.algorithm,
        encryptedAt: new Date()
      };
    } catch (error) {
      console.error('字段加密失败:', error);
      throw new Error(`字段加密失败: ${error.message}`);
    }
  }

  /**
   * 数据库字段解密
   */
  async decryptField(encryptedField) {
    try {
      if (!encryptedField.encrypted) {
        return encryptedField.data;
      }

      const decrypted = await this.symmetricDecrypt(encryptedField.data);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('字段解密失败:', error);
      throw new Error(`字段解密失败: ${error.message}`);
    }
  }

  /**
   * 批量数据加密
   */
  async encryptBatch(records, fields = [], classification = 'CONFIDENTIAL') {
    try {
      const encryptedRecords = [];

      for (const record of records) {
        const encryptedRecord = { ...record };

        for (const field of fields) {
          if (record[field] !== undefined && record[field] !== null) {
            const encrypted = await this.encryptField(record[field], classification);
            encryptedRecord[field] = encrypted;
          }
        }

        encryptedRecords.push(encryptedRecord);
      }

      return encryptedRecords;
    } catch (error) {
      console.error('批量加密失败:', error);
      throw new Error(`批量加密失败: ${error.message}`);
    }
  }

  /**
   * 批量数据解密
   */
  async decryptBatch(records, fields = []) {
    try {
      const decryptedRecords = [];

      for (const record of records) {
        const decryptedRecord = { ...record };

        for (const field of fields) {
          if (record[field] !== undefined && record[field] !== null) {
            const decrypted = await this.decryptField(record[field]);
            decryptedRecord[field] = decrypted;
          }
        }

        decryptedRecords.push(decryptedRecord);
      }

      return decryptedRecords;
    } catch (error) {
      console.error('批量解密失败:', error);
      throw new Error(`批量解密失败: ${error.message}`);
    }
  }

  /**
   * 文件加密
   */
  async encryptFile(filePath, outputPath, keyId = 'default_aes') {
    try {
      const fs = require('fs').promises;
      const fileData = await fs.readFile(filePath);

      const encrypted = await this.symmetricEncrypt(fileData, keyId);

      // 保存加密文件
      await fs.writeFile(outputPath, JSON.stringify(encrypted));

      return {
        success: true,
        originalPath: filePath,
        encryptedPath: outputPath,
        keyId: keyId,
        algorithm: encrypted.algorithm
      };
    } catch (error) {
      console.error('文件加密失败:', error);
      throw new Error(`文件加密失败: ${error.message}`);
    }
  }

  /**
   * 文件解密
   */
  async decryptFile(encryptedFilePath, outputPath) {
    try {
      const fs = require('fs').promises;
      const encryptedData = JSON.parse(await fs.readFile(encryptedFilePath, 'utf8'));

      const decrypted = await this.symmetricDecrypt(encryptedData);

      // 保存解密文件
      await fs.writeFile(outputPath, Buffer.from(decrypted, 'hex'));

      return {
        success: true,
        encryptedPath: encryptedFilePath,
        decryptedPath: outputPath
      };
    } catch (error) {
      console.error('文件解密失败:', error);
      throw new Error(`文件解密失败: ${error.message}`);
    }
  }

  /**
   * 密钥轮换
   */
  async rotateKey(keyId, algorithm = null) {
    try {
      // 保存旧密钥
      const oldKey = this.keyStore.get(keyId);

      // 生成新密钥
      const newKey = await this.generateSymmetricKey(algorithm);
      const oldKeyId = `${keyId}_old_${Date.now()}`;

      // 保存旧密钥用于数据迁移
      this.keyStore.set(oldKeyId, oldKey);
      this.keyStore.set(keyId, newKey);

      return {
        success: true,
        keyId: keyId,
        newKeyId: newKey.keyId,
        oldKeyId: oldKeyId,
        rotationDate: new Date(),
        migratedDataCount: 0 // 实际项目中需要统计迁移的数据量
      };
    } catch (error) {
      console.error('密钥轮换失败:', error);
      throw new Error(`密钥轮换失败: ${error.message}`);
    }
  }

  /**
   * 密钥管理
   */
  async manageKey(operation, keyId = null, keyData = null) {
    try {
      switch (operation) {
        case 'list':
          return {
            success: true,
            keys: Array.from(this.keyStore.keys()).map(id => ({
              id,
              type: this.keyStore.get(id).algorithm ? 'asymmetric' : 'symmetric',
              createdAt: new Date()
            }))
          };

        case 'get':
          const keyInfo = this.keyStore.get(keyId);
          if (!keyInfo) {
            throw new Error(`密钥不存在: ${keyId}`);
          }
          return {
            success: true,
            keyId,
            algorithm: keyInfo.algorithm,
            keyId: keyInfo.keyId
          };

        case 'delete':
          if (!this.keyStore.has(keyId)) {
            throw new Error(`密钥不存在: ${keyId}`);
          }
          this.keyStore.delete(keyId);
          return {
            success: true,
            keyId,
            deletedAt: new Date()
          };

        default:
          throw new Error(`不支持的操作: ${operation}`);
      }
    } catch (error) {
      console.error('密钥管理失败:', error);
      throw new Error(`密钥管理失败: ${error.message}`);
    }
  }

  /**
   * 加密策略检查
   */
  async checkEncryptionPolicy(data) {
    try {
      const policy = {
        encryptionRequired: false,
        recommendedAlgorithm: this.defaultConfig.symmetric.name,
        keyRotationRequired: false,
        complianceIssues: []
      };

      // 根据数据内容判断是否需要加密
      const sensitivePatterns = [
        /(\d{15}|\d{18})/, // 身份证号
        /\d{11}/, // 手机号
        /\d{16,19}/, // 银行卡号
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // 邮箱
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(data)) {
          policy.encryptionRequired = true;
          policy.complianceIssues.push('检测到敏感信息，需要加密存储');
          break;
        }
      }

      return policy;
    } catch (error) {
      console.error('加密策略检查失败:', error);
      throw new Error(`加密策略检查失败: ${error.message}`);
    }
  }

  /**
   * 生成密钥ID
   */
  generateKeyId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 加密性能测试
   */
  async performanceTest(dataSize = 1024, iterations = 1000) {
    try {
      const testData = 'x'.repeat(dataSize);
      const results = [];

      for (const [name, algorithm] of Object.entries(this.algorithms.symmetric)) {
        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
          await this.symmetricEncrypt(testData, 'test_key', algorithm);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        results.push({
          algorithm: name,
          dataSize: dataSize,
          iterations: iterations,
          totalTime: totalTime,
          avgTime: totalTime / iterations,
          throughput: (dataSize * iterations * 8) / (totalTime / 1000) // bps
        });
      }

      return {
        success: true,
        testResults: results,
        testConfiguration: {
          dataSize,
          iterations,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('性能测试失败:', error);
      throw new Error(`性能测试失败: ${error.message}`);
    }
  }
}

module.exports = new EncryptionService();