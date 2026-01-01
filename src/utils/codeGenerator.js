/**
 * 编码生成器
 * 用于生成家庭编码、用户编码等
 */

const crypto = require('crypto');

class CodeGenerator {
  /**
   * 生成家庭编码（一户一码）
   * 格式：F + 年份后2位 + 月份 + 村代码 + 随机6位
   * 示例：F240112345678
   */
  static generateFamilyCode(villageCode = '0000') {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `F${year}${month}${villageCode}${random}`;
  }

  /**
   * 生成村民编码
   * 格式：R + 年份后2位 + 村代码 + 流水号5位
   */
  static generateResidentCode(villageCode = '0000', sequence = 1) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const seq = sequence.toString().padStart(5, '0');

    return `R${year}${villageCode}${seq}`;
  }

  /**
   * 生成文档编号
   * 格式：DOC + 时间戳 + 随机4位
   */
  static generateDocumentNumber() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `DOC${timestamp}${random}`;
  }

  /**
   * 生成业务流水号
   * 格式：业务类型 + 年月日 + 随机6位
   */
  static generateBusinessNumber(businessType = 'BIZ') {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
                   (now.getMonth() + 1).toString().padStart(2, '0') +
                   now.getDate().toString().padStart(2, '0');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `${businessType}${dateStr}${random}`;
  }

  /**
   * 生成二维码内容
   * @param {string} type - 类型（family/resident/document）
   * @param {string} code - 编码
   */
  static generateQRCodeContent(type, code) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    return `${baseUrl}/qr/${type}/${code}`;
  }

  /**
   * 生成验证码
   * @param {number} length - 长度（默认6位）
   */
  static generateVerificationCode(length = 6) {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
  }

  /**
   * 生成临时访问令牌
   */
  static generateTempToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 生成邀请码
   * @param {string} prefix - 前缀（可选）
   */
  static generateInviteCode(prefix = 'INV') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${code}`;
  }

  /**
   * 生成设备ID
   */
  static generateDeviceId() {
    return `DEV_${  crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  }

  /**
   * 生成会话ID
   */
  static generateSessionId() {
    return `SES_${  crypto.randomBytes(32).toString('hex')}`;
  }
}

module.exports = CodeGenerator;