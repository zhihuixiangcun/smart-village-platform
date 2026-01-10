/**
 * 数据加密工具
 * 提供前端加密、解密、哈希计算等功能
 */

import CryptoJS from 'crypto-js';

/**
 * 加密配置
 */
const ENCRYPT_CONFIG = {
  // AES配置
  aes: {
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.Pkcs7,
    keySize: 256 / 32, // 256位
    ivSize: 128 / 32, // 128位
  },
};

/**
 * 生成随机密钥
 * @param {Number} length - 密钥长度（字节数）
 * @returns {String} 十六进制密钥
 */
export function generateRandomKey(length = 32) {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * 生成随机IV
 * @param {Number} length - IV长度（字节数）
 * @returns {String} 十六进制IV
 */
export function generateRandomIV(length = 16) {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * AES加密
 * @param {String} plaintext - 明文
 * @param {String} keyHex - 密钥（十六进制）
 * @returns {Object} 加密结果 { iv, tag, ciphertext }
 */
export function aesEncrypt(plaintext, keyHex) {
  try {
    if (!keyHex) {
      throw new Error('密钥不能为空');
    }

    // 生成随机IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // 将密钥转换为WordArray
    const key = CryptoJS.enc.Hex.parse(keyHex);

    // 加密
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    });

    // 获取认证标签
    const tag = encrypted.authTag;

    return {
      iv: iv.toString(CryptoJS.enc.Hex),
      tag: tag.toString(CryptoJS.enc.Hex),
      ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
      algorithm: 'aes-256-gcm',
      encoding: 'hex',
    };
  } catch (error) {
    console.error('AES加密失败:', error);
    throw new Error(`AES加密失败: ${error.message}`);
  }
}

/**
 * AES解密
 * @param {Object} encryptedData - 加密数据 { iv, tag, ciphertext }
 * @param {String} keyHex - 密钥（十六进制）
 * @returns {String} 明文
 */
export function aesDecrypt(encryptedData, keyHex) {
  try {
    const { iv, tag, ciphertext } = encryptedData;

    if (!keyHex) {
      throw new Error('密钥不能为空');
    }

    // 将密钥和IV转换为WordArray
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const ivParsed = CryptoJS.enc.Hex.parse(iv);

    // 组合密文和认证标签
    const ciphertextParsed = CryptoJS.enc.Hex.parse(ciphertext);

    // 创建CipherParams对象
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertextParsed,
      iv: ivParsed,
      tag: CryptoJS.enc.Hex.parse(tag),
    });

    // 解密
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: ivParsed,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('AES解密失败:', error);
    throw new Error(`AES解密失败: ${error.message}`);
  }
}

/**
 * 计算哈希值
 * @param {String} data - 数据
 * @param {String} algorithm - 哈希算法 (sha256, sha512, md5)
 * @returns {String} 哈希值（十六进制）
 */
export function calculateHash(data, algorithm = 'sha256') {
  try {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = CryptoJS[algorithm.toUpperCase()](dataStr);
    return hash.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('哈希计算失败:', error);
    throw new Error(`哈希计算失败: ${error.message}`);
  }
}

/**
 * HMAC签名
 * @param {String} data - 数据
 * @param {String} key - 密钥
 * @param {String} algorithm - 算法
 * @returns {String} 签名（十六进制）
 */
export function hmacSign(data, key, algorithm = 'sha256') {
  try {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hmac = CryptoJS[`Hmac${algorithm[0].toUpperCase()}${algorithm.slice(1)}`](dataStr, key);
    return hmac.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('HMAC签名失败:', error);
    throw new Error(`HMAC签名失败: ${error.message}`);
  }
}

/**
 * 验证HMAC签名
 * @param {String} data - 数据
 * @param {String} signature - 签名
 * @param {String} key - 密钥
 * @param {String} algorithm - 算法
 * @returns {Boolean} 是否匹配
 */
export function verifyHmac(data, signature, key, algorithm = 'sha256') {
  try {
    const calculatedSignature = hmacSign(data, key, algorithm);
    return calculatedSignature === signature;
  } catch (error) {
    console.error('HMAC验证失败:', error);
    return false;
  }
}

/**
 * Base64编码
 * @param {String} data - 数据
 * @returns {String} Base64编码
 */
export function base64Encode(data) {
  try {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(dataStr));
  } catch (error) {
    console.error('Base64编码失败:', error);
    throw new Error(`Base64编码失败: ${error.message}`);
  }
}

/**
 * Base64解码
 * @param {String} base64 - Base64编码
 * @returns {String} 解码后的数据
 */
export function base64Decode(base64) {
  try {
    const decoded = CryptoJS.enc.Base64.parse(base64);
    return decoded.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Base64解码失败:', error);
    throw new Error(`Base64解码失败: ${error.message}`);
  }
}

/**
 * UTF-8编码
 * @param {String} data - 数据
 * @returns {String} UTF-8编码
 */
export function utf8Encode(data) {
  return CryptoJS.enc.Utf8.parse(data).toString();
}

/**
 * UTF-8解码
 * @param {String} data - UTF-8编码
 * @returns {String} 解码后的数据
 */
export function utf8Decode(data) {
  return CryptoJS.enc.Utf8.parse(data).toString(CryptoJS.enc.Utf8);
}

/**
 * 生成UUID
 * @returns {String} UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成随机字符串
 * @param {Number} length - 长度
 * @param {String} charset - 字符集
 * @returns {String} 随机字符串
 */
export function generateRandomString(
  length = 16,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 密钥派生（PBKDF2）
 * @param {String} password - 密码
 * @param {String} salt - 盐值
 * @param {Number} iterations - 迭代次数
 * @param {Number} keySize - 密钥长度（字节数）
 * @returns {String} 派生密钥
 */
export function deriveKey(password, salt, iterations = 100000, keySize = 32) {
  try {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: keySize / 4, // CryptoJS使用32位字
      iterations,
    });
    return key.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('密钥派生失败:', error);
    throw new Error(`密钥派生失败: ${error.message}`);
  }
}

/**
 * 比较两个哈希值是否相同（时序安全）
 * @param {String} hash1 - 哈希值1
 * @param {String} hash2 - 哈希值2
 * @returns {Boolean} 是否相同
 */
export function timingSafeEqual(hash1, hash2) {
  if (hash1.length !== hash2.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
  }

  return result === 0;
}

/**
 * 数据分块加密
 * @param {String} data - 数据
 * @param {String} keyHex - 密钥
 * @param {Number} chunkSize - 块大小（字节）
 * @returns {Array} 加密块数组
 */
export function encryptInChunks(data, keyHex, chunkSize = 1024 * 1024) {
  const chunks = [];
  const totalLength = data.length;

  for (let i = 0; i < totalLength; i += chunkSize) {
    const chunk = data.substring(i, i + chunkSize);
    const encrypted = aesEncrypt(chunk, keyHex);
    chunks.push(encrypted);
  }

  return chunks;
}

/**
 * 数据分块解密
 * @param {Array} encryptedChunks - 加密块数组
 * @param {String} keyHex - 密钥
 * @returns {String} 解密后的数据
 */
export function decryptInChunks(encryptedChunks, keyHex) {
  return encryptedChunks.map(chunk => aesDecrypt(chunk, keyHex)).join('');
}

/**
 * 简单的XOR加密（仅用于轻度加密场景）
 * @param {String} data - 数据
 * @param {String} key - 密钥
 * @returns {String} 加密后的数据（Base64）
 */
export function xorEncrypt(data, key) {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return base64Encode(result);
}

/**
 * 简单的XOR解密
 * @param {String} encryptedData - 加密数据（Base64）
 * @param {String} key - 密钥
 * @returns {String} 解密后的数据
 */
export function xorDecrypt(encryptedData, key) {
  const data = base64Decode(encryptedData);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// 默认导出所有函数
export default {
  // 密钥和IV生成
  generateRandomKey,
  generateRandomIV,

  // AES加密解密
  aesEncrypt,
  aesDecrypt,

  // 哈希和签名
  calculateHash,
  hmacSign,
  verifyHmac,

  // 编码解码
  base64Encode,
  base64Decode,
  utf8Encode,
  utf8Decode,

  // 工具函数
  generateUUID,
  generateRandomString,
  deriveKey,
  timingSafeEqual,

  // 分块加密
  encryptInChunks,
  decryptInChunks,

  // XOR加密
  xorEncrypt,
  xorDecrypt,
};
