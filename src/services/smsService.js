/**
 * SMS服务 - 模拟短信发送
 * 开发环境使用，生产环境应替换为真实的短信服务商（如阿里云、腾讯云）
 */

const smsService = {
  // 存储验证码的临时缓存（生产环境应使用Redis）
  verificationCodes: new Map(),

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @returns {Promise<{success: boolean, code?: string, message?: string}>}
   */
  async sendVerificationCode(phone) {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    // 检查是否频繁发送（60秒内只能发送一次）
    const lastSent = this.verificationCodes.get(phone);
    if (lastSent && Date.now() - lastSent.timestamp < 60000) {
      return {
        success: false,
        message: '验证码发送过于频繁，请60秒后重试'
      };
    }

    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码（5分钟有效期）
    this.verificationCodes.set(phone, {
      code,
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // 在开发环境中，将验证码打印到控制台
    console.log('='.repeat(50));
    console.log(`[SMS Service] 发送验证码到 ${phone}`);
    console.log(`[SMS Service] 验证码: ${code}`);
    console.log('[SMS Service] 有效期: 5分钟');
    console.log('='.repeat(50));

    // 生产环境应调用真实短信服务商API
    // const result = await this.realSendSms(phone, code);

    return {
      success: true,
      message: '验证码已发送',
      // 开发/测试环境始终返回验证码
      code
    };
  },

  /**
   * 验证验证码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @returns {boolean}
   */
  verifyCode(phone, code) {
    const stored = this.verificationCodes.get(phone);

    if (!stored) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > stored.expiresAt) {
      this.verificationCodes.delete(phone);
      return false;
    }

    // 验证码匹配
    const isValid = stored.code === code;

    // 验证成功后删除验证码
    if (isValid) {
      this.verificationCodes.delete(phone);
    }

    return isValid;
  },

  /**
   * 清理过期的验证码（定时调用）
   */
  cleanExpiredCodes() {
    const now = Date.now();
    for (const [phone, data] of this.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        this.verificationCodes.delete(phone);
      }
    }
  }
};

// 每5分钟清理一次过期验证码
setInterval(() => {
  smsService.cleanExpiredCodes();
}, 5 * 60 * 1000);

module.exports = smsService;
