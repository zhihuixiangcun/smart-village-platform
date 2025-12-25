/**
 * 数据加密和脱敏工具
 * 用于敏感信息的加密存储和显示脱敏
 */

const crypto = require('crypto');

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;  // 256 bits
const IV_LENGTH = 16;   // 128 bits
const AUTH_TAG_LENGTH = 16;

// 从环境变量获取加密密钥（生产环境必须配置）
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set in environment variables!');
    // 开发环境使用临时密钥（生产环境必须配置）
    return crypto.randomBytes(KEY_LENGTH);
  }
  return Buffer.from(key, 'hex');
}

/**
 * 加密数据
 * @param {string} text - 明文
 * @returns {string} 加密后的数据（Base64编码）
 */
function encryptData(text) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 将IV、加密数据和认证标签组合后Base64编码
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex'),
      authTag
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('数据加密失败');
  }
}

/**
 * 解密数据
 * @param {string} encryptedData - 加密的数据（Base64编码）
 * @returns {string} 明文
 */
function decryptData(encryptedData) {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // 提取IV、加密数据和认证标签
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
    const authTag = combined.slice(combined.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('数据解密失败');
  }
}

/**
 * 身份证号脱敏
 * @param {string} idCard - 完整身份证号
 * @param {number} showFirst - 显示前几位（默认6位）
 * @param {number} showLast - 显示后几位（默认4位）
 * @returns {string} 脱敏后的身份证号
 */
function maskIdCard(idCard, showFirst = 6, showLast = 4) {
  if (!idCard || idCard.length < showFirst + showLast) {
    return idCard;
  }

  const first = idCard.substring(0, showFirst);
  const last = idCard.substring(idCard.length - showLast);
  const middleLength = idCard.length - showFirst - showLast;

  return `${first}${'*'.repeat(middleLength)}${last}`;
}

/**
 * 手机号脱敏
 * @param {string} phone - 完整手机号
 * @returns {string} 脱敏后的手机号
 */
function maskPhone(phone) {
  if (!phone || phone.length !== 11) {
    return phone;
  }

  return phone.replace(/^(.{3})(.*)(.{4})$/, '$1****$3');
}

/**
 * 银行卡号脱敏
 * @param {string} cardNumber - 完整银行卡号
 * @param {number} showLast - 显示后几位（默认4位）
 * @returns {string} 脱敏后的银行卡号
 */
function maskBankCard(cardNumber, showLast = 4) {
  if (!cardNumber || cardNumber.length < showLast) {
    return cardNumber;
  }

  const last = cardNumber.substring(cardNumber.length - showLast);
  const maskedLength = cardNumber.length - showLast;

  return `${'*'.repeat(maskedLength)}${last}`;
}

/**
 * 姓名脱敏
 * @param {string} name - 完整姓名
 * @returns {string} 脱敏后的姓名
 */
function maskName(name) {
  if (!name) {
    return name;
  }

  if (name.length === 2) {
    return name[0] + '*';
  } else if (name.length === 3) {
    return name[0] + '*' + name[2];
  } else {
    return name[0] + '*' + name[name.length - 1];
  }
}

/**
 * 地址脱敏
 * @param {string} address - 完整地址
 * @param {number} keepLength - 保留前几位（默认10位）
 * @returns {string} 脱敏后的地址
 */
function maskAddress(address, keepLength = 10) {
  if (!address || address.length <= keepLength) {
    return address;
  }

  return address.substring(0, keepLength) + '***';
}

/**
 * 批量脱敏对象中的敏感字段
 * @param {object} data - 原始数据对象
 * @param {object} options - 脱敏配置
 * @returns {object} 脱敏后的数据对象
 */
function maskSensitiveData(data, options = {}) {
  const {
    maskIdCard: maskId = true,
    maskPhone: maskPhoneNum = true,
    maskBankCard: maskCard = true,
    maskName: maskNameFlag = false,
    maskAddress: maskAddr = false,
    customMasks = {}
  } = options;

  const maskedData = { ...data };

  // 身份证脱敏
  if (maskId && maskedData.idCard) {
    maskedData.idCard = maskIdCard(maskedData.idCard);
    if (maskedData.idCardVerified) {
      maskedData.idCardVerified = '**************';
    }
  }

  // 手机号脱敏
  if (maskPhoneNum && maskedData.phone) {
    maskedData.phone = maskPhone(maskedData.phone);
  }
  if (maskPhoneNum && maskedData.contact && maskedData.contact.phone) {
    maskedData.contact.phone = maskPhone(maskedData.contact.phone);
  }

  // 银行卡脱敏
  if (maskCard && maskedData.bankCard) {
    maskedData.bankCard = maskBankCard(maskedData.bankCard);
  }

  // 姓名脱敏
  if (maskNameFlag && maskedData.name) {
    maskedData.name = maskName(maskedData.name);
  }

  // 地址脱敏
  if (maskAddr && maskedData.address) {
    maskedData.address = maskAddress(maskedData.address);
  }

  // 自定义脱敏规则
  if (customMasks && typeof customMasks === 'object') {
    Object.keys(customMasks).forEach(field => {
      if (maskedData[field]) {
        const maskFunction = customMasks[field];
        if (typeof maskFunction === 'function') {
          maskedData[field] = maskFunction(maskedData[field]);
        } else if (typeof maskFunction === 'string') {
          maskedData[field] = maskFunction;
        }
      }
    });
  }

  return maskedData;
}

/**
 * 生成哈希值（用于密码等不可逆加密）
 * @param {string} text - 明文
 * @param {string} salt - 盐值
 * @returns {string} 哈希值
 */
function hashData(text, salt = null) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .createHmac('sha256', actualSalt)
    .update(text)
    .digest('hex');

  return `${salt}:${hash}`;
}

/**
 * 验证哈希值
 * @param {string} text - 明文
 * @param {string} hashedData - 哈希数据（格式：salt:hash）
 * @returns {boolean} 是否匹配
 */
function verifyHash(text, hashedData) {
  if (!hashedData || !hashedData.includes(':')) {
    return false;
  }

  const [salt, originalHash] = hashedData.split(':');
  const newHash = crypto
    .createHmac('sha256', salt)
    .update(text)
    .digest('hex');

  return newHash === originalHash;
}

/**
 * 生成随机Token
 * @param {number} length - Token长度（字节）
 * @returns {string} Hex格式的Token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成UUID
 * @returns {string} UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * 数据签名
 * @param {object|string} data - 要签名的数据
 * @param {string} secret - 签名密钥
 * @returns {string} 签名
 */
function signData(data, secret) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');
}

/**
 * 验证数据签名
 * @param {object|string} data - 原始数据
 * @param {string} signature - 签名
 * @param {string} secret - 签名密钥
 * @returns {boolean} 签名是否有效
 */
function verifySignature(data, signature, secret) {
  const expectedSignature = signData(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

module.exports = {
  encryptData,
  decryptData,
  maskIdCard,
  maskPhone,
  maskBankCard,
  maskName,
  maskAddress,
  maskSensitiveData,
  hashData,
  verifyHash,
  generateToken,
  generateUUID,
  signData,
  verifySignature
};
