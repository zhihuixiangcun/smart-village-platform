/**
 * 数据加密工具
 * 用于敏感数据的加密和解密
 */
import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPT_SECRET_KEY || 'smart-village-2025';

/**
 * 数据加密服务
 */
export const encryptionService = {
  /**
   * AES加密
   * @param {string} data 待加密数据
   * @returns {string} 加密后的数据
   */
  encrypt(data) {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return data;
    }
  },

  /**
   * AES解密
   * @param {string} encryptedData 加密的数据
   * @returns {string} 解密后的数据
   */
  decrypt(encryptedData) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData;
    }
  },

  /**
   * 批量加密对象
   * @param {Object} obj 待加密对象
   * @param {Array<string>} fields 需要加密的字段
   * @returns {Object} 加密后的对象
   */
  encryptObject(obj, fields = []) {
    const encrypted = { ...obj };

    fields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field].toString());
      }
    });

    return encrypted;
  },

  /**
   * 批量解密对象
   * @param {Object} obj 加密的对象
   * @param {Array<string>} fields 需要解密的字段
   * @returns {Object} 解密后的对象
   */
  decryptObject(obj, fields = []) {
    const decrypted = { ...obj };

    fields.forEach(field => {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field]);
      }
    });

    return decrypted;
  },

  /**
   * 身份证号脱敏
   * @param {string} idCard 身份证号
   * @param {number} showPrefix 显示前几位
   * @param {number} showSuffix 显示后几位
   * @returns {string} 脱敏后的身份证号
   */
  maskIdCard(idCard, showPrefix = 6, showSuffix = 4) {
    if (!idCard) return '';

    const len = idCard.length;
    if (len <= showPrefix + showSuffix) {
      return idCard;
    }

    const prefix = idCard.substring(0, showPrefix);
    const suffix = idCard.substring(len - showSuffix);
    const mask = '*'.repeat(len - showPrefix - showSuffix);

    return prefix + mask + suffix;
  },

  /**
   * 手机号脱敏
   * @param {string} phone 手机号
   * @returns {string} 脱敏后的手机号
   */
  maskPhone(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  },

  /**
   * 银行卡号脱敏
   * @param {string} cardNo 银行卡号
   * @returns {string} 脱敏后的银行卡号
   */
  maskBankCard(cardNo) {
    if (!cardNo) return '';
    const len = cardNo.length;
    const showDigits = 4;
    if (len <= showDigits) return cardNo;

    const suffix = cardNo.substring(len - showDigits);
    return '*'.repeat(len - showDigits) + suffix;
  },

  /**
   * 姓名脱敏
   * @param {string} name 姓名
   * @returns {string} 脱敏后的姓名
   */
  maskName(name) {
    if (!name) return '';
    if (name.length <= 1) return name;

    const firstChar = name[0];
    return `${firstChar  }*`;
  },

  /**
   * 地址脱敏(保留到街道/村)
   * @param {string} address 地址
   * @returns {string} 脱敏后的地址
   */
  maskAddress(address) {
    if (!address) return '';

    // 保留到村或街道一级
    const patterns = [
      /^(.{6}?(村|街道|社区))(.*)$/,
      /^(.{10}?(镇|乡|区))(.*)$/
    ];

    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        return `${match[1]  }****`;
      }
    }

    // 如果匹配不到,保留前6个字符
    if (address.length > 6) {
      return `${address.substring(0, 6)  }****`;
    }

    return address;
  }
};

/**
 * 敏感字段配置
 */
export const sensitiveFields = {
  // 用户敏感字段
  user: ['idCard', 'phone', 'email', 'bankAccount', 'password'],

  // 村民档案敏感字段
  resident: ['idCard', 'phone', 'bankAccount', 'insuranceNo', 'medicalRecord'],

  // 财务敏感字段
  finance: ['bankAccount', 'amount', 'income', 'expense'],

  // 证件敏感字段
  document: ['idCard', 'issueDate', 'expiryDate', 'documentNo']
};

export default encryptionService;
