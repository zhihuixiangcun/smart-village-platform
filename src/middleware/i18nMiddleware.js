/**
 * i18n 国际化中间件
 * 提供自动语言检测和响应翻译功能
 *
 * 功能特性：
 * - 从 Accept-Language 头检测语言偏好
 * - 支持查询参数 (?lang=zh-CN)
 * - 支持自定义请求头 (X-Language)
 * - 支持用户数据库存储的语言偏好
 * - 自动翻译响应消息
 * - 方言支持：普通话、粤语、闽南语、客家话、四川话
 */

const i18n = require('../i18n/smartVillageI18n');
const logger = require('../utils/logger');

// 语言检测优先级
const LANGUAGE_DETECTION_PRIORITY = {
  QUERY_PARAM: 1,        // ?lang=xx
  HEADER: 2,             // X-Language: xx
  USER_PREFERENCE: 3,    // 从数据库获取的用户偏好
  ACCEPT_LANGUAGE: 4,    // Accept-Language header
  DEFAULT: 5             // 默认中文
};

class I18nMiddleware {
  constructor(options = {}) {
    this.queryParam = options.queryParam || 'lang';
    this.headerName = options.headerName || 'X-Language';
    this.cookieName = options.cookieName || 'preferred_language';
    this.defaultLocale = options.defaultLocale || 'zh-CN';
    this.enableAutoTranslation = options.enableAutoTranslation !== false;
    this.supportedLocales = i18n.supportedLocales.map(l => l.code);

    // 语言缓存（避免重复检测）
    this.languageCache = new Map();
  }

  /**
   * 主中间件函数
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // 1. 检测语言
        const detectedLocale = await this.detectLanguage(req);

        // 2. 设置当前语言
        i18n.setLocale(detectedLocale);

        // 3. 将i18n功能附加到请求对象
        req.i18n = {
          locale: detectedLocale,
          t: (key, params) => i18n.t(key, detectedLocale, params),
          setLocale: (locale) => this.setUserLanguage(req, locale),
          getLocale: () => detectedLocale,
          getSupportedLocales: () => this.supportedLocales
        };

        // 4. 将语言信息附加到响应对象
        res.locals.i18n = {
          locale: detectedLocale,
          t: (key, params) => i18n.t(key, detectedLocale, params)
        };

        // 5. 设置响应头告知客户端使用的语言
        res.setHeader('Content-Language', detectedLocale);

        // 6. 如果启用自动翻译，增强 res.json()
        if (this.enableAutoTranslation) {
          this.enhanceResponse(res, detectedLocale);
        }

        // 7. 记录语言使用情况（仅开发环境）
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[i18n] 语言检测: ${detectedLocale}`, {
            userAgent: req.get('user-agent')?.substring(0, 50),
            acceptLanguage: req.get('accept-language'),
            detectedFrom: this.getDetectionSource(req)
          });
        }

        next();
      } catch (error) {
        logger.error('[i18n] 中间件错误:', error);
        // 发生错误时使用默认语言继续
        req.i18n = {
          locale: this.defaultLocale,
          t: (key, params) => i18n.t(key, this.defaultLocale, params),
          getLocale: () => this.defaultLocale
        };
        next();
      }
    };
  }

  /**
   * 检测用户语言偏好
   * 按优先级顺序检测多个来源
   */
  async detectLanguage(req) {
    // 1. 查询参数 (?lang=xx)
    const queryLang = req.query[this.queryParam];
    if (queryLang && this.isValidLocale(queryLang)) {
      return queryLang;
    }

    // 2. 自定义请求头 (X-Language: xx)
    const headerLang = req.get(this.headerName);
    if (headerLang && this.isValidLocale(headerLang)) {
      return headerLang;
    }

    // 3. Cookie 中的偏好语言
    const cookieLang = this.getCookieValue(req, this.cookieName);
    if (cookieLang && this.isValidLocale(cookieLang)) {
      return cookieLang;
    }

    // 4. 用户数据库偏好（如果已登录）
    if (req.user && req.user.preferredLanguage) {
      const userLang = req.user.preferredLanguage;
      if (this.isValidLocale(userLang)) {
        return userLang;
      }
    }

    // 5. Accept-Language 头
    const acceptLanguage = req.get('accept-language');
    if (acceptLanguage) {
      const detectedLang = i18n.detectUserLanguage(req.get('user-agent'), acceptLanguage);
      if (this.isValidLocale(detectedLang)) {
        return detectedLang;
      }
    }

    // 6. 默认语言
    return this.defaultLocale;
  }

  /**
   * 验证语言代码是否有效
   */
  isValidLocale(locale) {
    return this.supportedLocales.includes(locale);
  }

  /**
   * 获取语言检测来源（用于调试）
   */
  getDetectionSource(req) {
    if (req.query[this.queryParam]) return 'query';
    if (req.get(this.headerName)) return 'header';
    if (this.getCookieValue(req, this.cookieName)) return 'cookie';
    if (req.user?.preferredLanguage) return 'user';
    if (req.get('accept-language')) return 'accept-language';
    return 'default';
  }

  /**
   * 增强响应对象，添加自动翻译功能
   */
  enhanceResponse(res, locale) {
    // 保存原始的 json 方法
    const originalJson = res.json.bind(res);

    // 重写 json 方法以支持自动翻译
    res.json = function(data) {
      // 如果数据包含 message 字段，尝试翻译
      if (data && typeof data === 'object') {
        const translatedData = this.translateResponse(data, locale);
        return originalJson(translatedData);
      }
      return originalJson(data);
    }.bind(this);
  }

  /**
   * 递归翻译响应对象中的消息
   */
  translateResponse(obj, locale) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => this.translateResponse(item, locale));
    }

    const translated = {};

    for (const [key, value] of Object.entries(obj)) {
      // 翻译常见的消息字段
      if ((key === 'message' || key === 'error' || key === 'success' || key === 'warning') &&
          typeof value === 'string' &&
          (value.includes('.') || this.isTranslationKey(value))) {
        translated[key] = i18n.t(value, locale);
      }
      // 递归处理嵌套对象
      else if (typeof value === 'object' && value !== null) {
        translated[key] = this.translateResponse(value, locale);
      }
      else {
        translated[key] = value;
      }
    }

    return translated;
  }

  /**
   * 判断是否是翻译键（格式: domain.key）
   */
  isTranslationKey(str) {
    return /^[a-z_]+\.[a-z_]+$/i.test(str);
  }

  /**
   * 设置用户语言偏好
   */
  async setUserLanguage(req, locale) {
    if (!this.isValidLocale(locale)) {
      throw new Error(`不支持的语言: ${locale}`);
    }

    // 如果用户已登录，保存到数据库
    if (req.user && req.user._id) {
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user._id, {
          preferredLanguage: locale
        });
        logger.info(`[i18n] 用户语言偏好已更新: ${req.user._id} -> ${locale}`);
      } catch (error) {
        logger.error('[i18n] 更新用户语言偏好失败:', error);
      }
    }

    // 设置 Cookie
    res?.cookie(this.cookieName, locale, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1年
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return locale;
  }

  /**
   * 从请求中获取 Cookie 值
   */
  getCookieValue(req, name) {
    const cookies = req.headers.cookie;
    if (!cookies) return null;

    const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? match[2] : null;
  }

  /**
   * 创建语言切换路由处理器
   */
  createLanguageSwitchHandler() {
    return async (req, res) => {
      try {
        const { language } = req.body;

        if (!language) {
          return res.status(400).json({
            success: false,
            message: 'errors.invalid_language'
          });
        }

        if (!this.isValidLocale(language)) {
          return res.status(400).json({
            success: false,
            message: 'errors.unsupported_language',
            supportedLanguages: this.supportedLocales
          });
        }

        // 设置用户语言
        await this.setUserLanguage(req, language);

        res.json({
          success: true,
          message: 'success.language_switched',
          locale: language,
          supportedLocales: i18n.getSupportedLocales()
        });
      } catch (error) {
        logger.error('[i18n] 语言切换失败:', error);
        res.status(500).json({
          success: false,
          message: 'errors.server_error'
        });
      }
    };
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguagesInfo() {
    return i18n.getSupportedLocales().map(locale => ({
      code: locale.code,
      name: locale.name,
      family: locale.family
    }));
  }
}

// 导出单例和类
const i18nMiddleware = new I18nMiddleware();

module.exports = {
  I18nMiddleware,
  i18nMiddleware,
  // 快捷中间件
  i18n: () => i18nMiddleware.middleware()
};
