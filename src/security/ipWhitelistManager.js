const fs = require('fs').promises;
const path = require('path');
const net = require('net');
const crypto = require('crypto');

/**
 * IP白名单管理系统
 * 支持CIDR网段、动态更新、地理位置过滤
 */
class IPWhitelistManager {
  constructor() {
    this.config = {
      // 白名单配置文件路径
      whitelistFile: path.join(__dirname, '../../config/ip-whitelist.json'),
      blacklistFile: path.join(__dirname, '../../config/ip-blacklist.json'),
      geoIPFile: path.join(__dirname, '../../config/geo-rules.json'),

      // 默认配置
      defaultMode: 'whitelist', // whitelist, blacklist, disabled
      enableGeoFiltering: true,
      enableDynamicWhitelist: true,

      // 缓存配置
      cacheTimeout: 300000, // 5分钟缓存
      cleanupInterval: 60000, // 1分钟清理间隔

      // 安全配置
      maxWhitelistEntries: 10000,
      maxBlacklistEntries: 5000,
      enableSuspiciousIPDetection: true
    };

    // 白名单数据结构
    this.whitelist = {
      global: {
        ips: [],
        cidrs: [],
        ranges: [],
        lastUpdate: null,
        version: 1
      },
      paths: {},
      services: {},
      dynamic: {
        entries: [],
        ttl: 3600000 // 1小时
      }
    };

    // 黑名单数据结构
    this.blacklist = {
      ips: [],
      cidrs: [],
      ranges: [],
      suspicious: [],
      lastUpdate: null,
      version: 1
    };

    // 地理位置规则
    this.geoRules = {
      allowedCountries: ['CN'], // 允许的国家代码
      blockedRegions: [], // 屏蔽的地区
      suspiciousCountries: [], // 可疑国家（需要额外验证）
      lastUpdate: null
    };

    // 缓存
    this.ipCache = new Map();
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // 初始化
    this.initialize();
  }

  /**
   * 初始化IP白名单管理器
   */
  async initialize() {
    try {
      await this.loadWhitelistConfig();
      await this.loadBlacklistConfig();
      await this.loadGeoRulesConfig();

      console.log('✅ IP白名单管理器初始化完成');
      this.startCleanupTask();
    } catch (error) {
      console.error('❌ IP白名单管理器初始化失败:', error);
      // 初始化失败时使用默认配置
      this.initializeDefaultConfig();
    }
  }

  /**
   * 初始化默认配置
   */
  initializeDefaultConfig() {
    // 默认允许本地网络
    this.whitelist.global.cidrs = [
      '127.0.0.0/8',    // 本地回环
      '10.0.0.0/8',     // 私有网络A类
      '172.16.0.0/12',  // 私有网络B类
      '192.168.0.0/16', // 私有网络C类
      '169.254.0.0/16', // 链路本地地址
      '::1/128',        // IPv6本地回环
      'fc00::/7'        // IPv6私有地址
    ];

    console.log('📝 使用默认IP白名单配置');
  }

  /**
   * 加载白名单配置
   */
  async loadWhitelistConfig() {
    try {
      const data = await fs.readFile(this.config.whitelistFile, 'utf8');
      const config = JSON.parse(data);

      this.whitelist = { ...this.whitelist, ...config };
      this.whitelist.global.lastUpdate = new Date(config.global.lastUpdate || Date.now());

      console.log(`📖 加载IP白名单配置: ${this.getTotalWhitelistEntries()} 条记录`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      console.log('⚠️ 白名单配置文件不存在，使用默认配置');
    }
  }

  /**
   * 加载黑名单配置
   */
  async loadBlacklistConfig() {
    try {
      const data = await fs.readFile(this.config.blacklistFile, 'utf8');
      const config = JSON.parse(data);

      this.blacklist = { ...this.blacklist, ...config };
      this.blacklist.lastUpdate = new Date(config.lastUpdate || Date.now());

      console.log(`📖 加载IP黑名单配置: ${this.getTotalBlacklistEntries()} 条记录`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      console.log('⚠️ 黑名单配置文件不存在，使用默认配置');
    }
  }

  /**
   * 加载地理位置规则
   */
  async loadGeoRulesConfig() {
    try {
      const data = await fs.readFile(this.config.geoIPFile, 'utf8');
      const config = JSON.parse(data);

      this.geoRules = { ...this.geoRules, ...config };
      this.geoRules.lastUpdate = new Date(config.lastUpdate || Date.now());

      console.log(`📖 加载地理位置规则: ${this.geoRules.allowedCountries.length} 个允许国家`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      console.log('⚠️ 地理位置规则文件不存在，使用默认配置');
    }
  }

  /**
   * IP白名单验证中间件
   */
  validateIP(options = {}) {
    return async (req, res, next) => {
      try {
        this.stats.totalRequests++;

        const clientIP = this.getClientIP(req);
        const path = req.path;
        const method = req.method;

        // 检查缓存
        const cacheKey = this.getCacheKey(clientIP, path, options);
        const cachedResult = this.ipCache.get(cacheKey);

        if (cachedResult && (Date.now() - cachedResult.timestamp) < this.config.cacheTimeout) {
          this.stats.cacheHits++;

          if (cachedResult.allowed) {
            this.stats.allowedRequests++;
            return next();
          } else {
            this.stats.blockedRequests++;
            return this.sendBlockedResponse(res, cachedResult.reason, cachedResult.details);
          }
        }

        this.stats.cacheMisses++;

        // 执行IP验证
        const validationResult = await this.validateIPAddress(clientIP, path, method, options);

        // 缓存结果
        this.ipCache.set(cacheKey, {
          allowed: validationResult.allowed,
          reason: validationResult.reason,
          details: validationResult.details,
          timestamp: Date.now()
        });

        if (validationResult.allowed) {
          this.stats.allowedRequests++;
          next();
        } else {
          this.stats.blockedRequests++;
          this.sendBlockedResponse(res, validationResult.reason, validationResult.details);
        }

      } catch (error) {
        console.error('IP验证错误:', error);
        // 错误时允许请求通过，避免影响正常服务
        this.stats.suspiciousRequests++;
        next();
      }
    };
  }

  /**
   * 获取客户端真实IP
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.connection?.socket?.remoteAddress ||
           '127.0.0.1';
  }

  /**
   * 验证IP地址
   */
  async validateIPAddress(ip, path, method, options = {}) {
    try {
      // 1. 首先检查黑名单
      if (this.isIPBlacklisted(ip)) {
        return {
          allowed: false,
          reason: 'BLACKLISTED',
          details: 'IP地址在黑名单中'
        };
      }

      // 2. 检查是否为可疑IP
      if (this.isSuspiciousIP(ip)) {
        return {
          allowed: false,
          reason: 'SUSPICIOUS_IP',
          details: 'IP地址被标记为可疑'
        };
      }

      // 3. 检查地理位置过滤
      if (this.config.enableGeoFiltering) {
        const geoResult = await this.validateGeoLocation(ip);
        if (!geoResult.allowed) {
          return geoResult;
        }
      }

      // 4. 检查白名单模式
      if (this.config.defaultMode === 'disabled') {
        return { allowed: true, reason: 'DISABLED' };
      }

      if (this.config.defaultMode === 'blacklist') {
        return { allowed: true, reason: 'BLACKLIST_MODE' };
      }

      // 5. 检查白名单
      const whitelistResult = await this.checkWhitelist(ip, path, method);
      return whitelistResult;

    } catch (error) {
      console.error('IP验证过程中出错:', error);
      // 出错时默认允许，但记录为可疑
      this.stats.suspiciousRequests++;
      return { allowed: true, reason: 'ERROR_FALLBACK', details: error.message };
    }
  }

  /**
   * 检查IP是否在黑名单中
   */
  isIPBlacklisted(ip) {
    // 检查精确匹配
    if (this.blacklist.ips.includes(ip)) {
      return true;
    }

    // 检查CIDR网段
    for (const cidr of this.blacklist.cidrs) {
      if (this.isIPInCIDR(ip, cidr)) {
        return true;
      }
    }

    // 检查IP范围
    for (const range of this.blacklist.ranges) {
      if (this.isIPInRange(ip, range.start, range.end)) {
        return true;
      }
    }

    // 检查可疑IP
    for (const suspicious of this.blacklist.suspicious) {
      if (this.isIPInCIDR(ip, suspicious.cidr)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否为可疑IP
   */
  isSuspiciousIP(ip) {
    if (!this.config.enableSuspiciousIPDetection) {
      return false;
    }

    // 检查是否为代理/VPN出口IP
    if (this.isProxyIP(ip)) {
      return true;
    }

    // 检查是否为Tor出口节点
    if (this.isTorExitNode(ip)) {
      return true;
    }

    // 检查是否为已知的恶意IP
    if (this.isMaliciousIP(ip)) {
      return true;
    }

    return false;
  }

  /**
   * 验证地理位置
   */
  async validateGeoLocation(ip) {
    try {
      const geoInfo = await this.getGeoInfo(ip);

      // 检查是否在允许的国家列表中
      if (this.geoRules.allowedCountries.length > 0) {
        if (!this.geoRules.allowedCountries.includes(geoInfo.countryCode)) {
          return {
            allowed: false,
            reason: 'GEO_BLOCKED',
            details: `来自不允许的国家: ${geoInfo.countryCode} (${geoInfo.countryName})`
          };
        }
      }

      // 检查是否在屏蔽的地区中
      for (const region of this.geoRules.blockedRegions) {
        if (geoInfo.region && geoInfo.region.includes(region)) {
          return {
            allowed: false,
            reason: 'REGION_BLOCKED',
            details: `来自不允许的地区: ${region}`
          };
        }
      }

      // 检查是否为可疑国家
      if (this.geoRules.suspiciousCountries.includes(geoInfo.countryCode)) {
        return {
          allowed: false,
          reason: 'SUSPICIOUS_COUNTRY',
          details: `来自可疑国家: ${geoInfo.countryCode} (${geoInfo.countryName})`,
          requiresAdditionalVerification: true
        };
      }

      return { allowed: true, reason: 'GEO_ALLOWED', geoInfo };

    } catch (error) {
      console.error('地理位置验证错误:', error);
      return { allowed: true, reason: 'GEO_ERROR', details: error.message };
    }
  }

  /**
   * 检查白名单
   */
  async checkWhitelist(ip, path, method) {
    // 检查全局白名单
    if (this.isIPWhitelisted(ip, this.whitelist.global)) {
      return { allowed: true, reason: 'GLOBAL_WHITELIST' };
    }

    // 检查路径特定白名单
    for (const [pathPattern, config] of Object.entries(this.whitelist.paths)) {
      if (this.pathMatches(path, pathPattern)) {
        if (this.isIPWhitelisted(ip, config)) {
          return { allowed: true, reason: 'PATH_WHITELIST', pathPattern };
        }
      }
    }

    // 检查服务特定白名单
    for (const [serviceName, config] of Object.entries(this.whitelist.services)) {
      if (this.pathMatches(path, `/${serviceName}/*`)) {
        if (this.isIPWhitelisted(ip, config)) {
          return { allowed: true, reason: 'SERVICE_WHITELIST', serviceName };
        }
      }
    }

    // 检查动态白名单
    if (this.config.enableDynamicWhitelist) {
      if (this.isInDynamicWhitelist(ip)) {
        return { allowed: true, reason: 'DYNAMIC_WHITELIST' };
      }
    }

    return {
      allowed: false,
      reason: 'NOT_WHITELISTED',
      details: 'IP地址不在白名单中'
    };
  }

  /**
   * 检查IP是否在白名单中
   */
  isIPWhitelisted(ip, config) {
    // 检查精确匹配
    if (config.ips && config.ips.includes(ip)) {
      return true;
    }

    // 检查CIDR网段
    if (config.cidrs) {
      for (const cidr of config.cidrs) {
        if (this.isIPInCIDR(ip, cidr)) {
          return true;
        }
      }
    }

    // 检查IP范围
    if (config.ranges) {
      for (const range of config.ranges) {
        if (this.isIPInRange(ip, range.start, range.end)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 判断IP是否在CIDR网段内
   */
  isIPInCIDR(ip, cidr) {
    try {
      const [network, prefix] = cidr.split('/');
      const ipInt = this.ipToInt(ip);
      const networkInt = this.ipToInt(network);
      const mask = (0xffffffff << (32 - parseInt(prefix))) >>> 0;

      return (ipInt & mask) === (networkInt & mask);
    } catch (error) {
      return false;
    }
  }

  /**
   * 判断IP是否在指定范围内
   */
  isIPInRange(ip, startIP, endIP) {
    try {
      const ipInt = this.ipToInt(ip);
      const startInt = this.ipToInt(startIP);
      const endInt = this.ipToInt(endIP);

      return ipInt >= startInt && ipInt <= endInt;
    } catch (error) {
      return false;
    }
  }

  /**
   * IP地址转换为整数
   */
  ipToInt(ip) {
    const parts = ip.split('.');
    return parts.reduce((acc, part, index) => {
      return acc + (parseInt(part) << (8 * (3 - index)));
    }, 0);
  }

  /**
   * 路径匹配
   */
  pathMatches(path, pattern) {
    // 简单的通配符匹配
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(path);
  }

  /**
   * 获取地理位置信息
   */
  async getGeoInfo(ip) {
    try {
      // 这里可以集成MaxMind GeoIP或其他地理位置服务
      // 暂时返回默认值
      if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
          ipAddress: ip,
          countryCode: 'CN',
          countryName: 'China',
          region: 'Local',
          city: 'Local',
          isPrivate: true
        };
      }

      // 模拟地理位置查询
      return {
        ipAddress: ip,
        countryCode: 'CN',
        countryName: 'China',
        region: 'Unknown',
        city: 'Unknown',
        isPrivate: false
      };

    } catch (error) {
      throw new Error(`无法获取IP地理位置信息: ${error.message}`);
    }
  }

  /**
   * 判断是否为代理IP
   */
  isProxyIP(ip) {
    // 这里可以集成代理IP数据库
    // 暂时返回false
    return false;
  }

  /**
   * 判断是否为Tor出口节点
   */
  isTorExitNode(ip) {
    // 这里可以集成Tor出口节点列表
    // 暂时返回false
    return false;
  }

  /**
   * 判断是否为恶意IP
   */
  isMaliciousIP(ip) {
    // 这里可以集成威胁情报数据库
    // 暂时返回false
    return false;
  }

  /**
   * 检查动态白名单
   */
  isInDynamicWhitelist(ip) {
    const now = Date.now();

    for (const entry of this.whitelist.dynamic.entries) {
      if (entry.ip === ip && now < entry.expiresAt) {
        return true;
      }
    }

    return false;
  }

  /**
   * 添加动态白名单条目
   */
  addToDynamicWhitelist(ip, durationMinutes = 60, reason = '') {
    const entry = {
      ip,
      addedAt: Date.now(),
      expiresAt: Date.now() + (durationMinutes * 60 * 1000),
      reason,
      addedBy: 'system'
    };

    this.whitelist.dynamic.entries.push(entry);

    // 清理过期条目
    this.cleanupDynamicWhitelist();

    return entry;
  }

  /**
   * 清理过期的动态白名单条目
   */
  cleanupDynamicWhitelist() {
    const now = Date.now();
    this.whitelist.dynamic.entries = this.whitelist.dynamic.entries.filter(
      entry => entry.expiresAt > now
    );
  }

  /**
   * 发送被阻止的响应
   */
  sendBlockedResponse(res, reason, details) {
    const status = reason === 'SUSPICIOUS_IP' ? 403 : 401;

    res.status(status).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: '访问被拒绝',
      reason,
      details,
      timestamp: new Date().toISOString(),
      contact: 'contact@smart-village.gov.cn'
    });
  }

  /**
   * 获取缓存键
   */
  getCacheKey(ip, path, options) {
    const keyData = `${ip}:${path}:${JSON.stringify(options)}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  /**
   * 启动清理任务
   */
  startCleanupTask() {
    setInterval(() => {
      this.cleanupCache();
      this.cleanupDynamicWhitelist();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理缓存
   */
  cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.ipCache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.ipCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期的IP缓存条目`);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.totalRequests > 0 ?
        (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      cacheHitRate: (this.stats.cacheHits + this.stats.cacheMisses) > 0 ?
        (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%' : '0%',
      cacheSize: this.ipCache.size,
      whitelistMode: this.config.defaultMode,
      totalWhitelistEntries: this.getTotalWhitelistEntries(),
      totalBlacklistEntries: this.getTotalBlacklistEntries()
    };
  }

  /**
   * 获取白名单总条目数
   */
  getTotalWhitelistEntries() {
    let total = 0;
    total += this.whitelist.global.ips.length;
    total += this.whitelist.global.cidrs.length;
    total += this.whitelist.global.ranges.length;
    return total;
  }

  /**
   * 获取黑名单总条目数
   */
  getTotalBlacklistEntries() {
    let total = 0;
    total += this.blacklist.ips.length;
    total += this.blacklist.cidrs.length;
    total += this.blacklist.ranges.length;
    total += this.blacklist.suspicious.length;
    return total;
  }

  /**
   * 更新配置
   */
  async updateConfig(type, config) {
    try {
      if (type === 'whitelist') {
        this.whitelist = { ...this.whitelist, ...config };
        await this.saveWhitelistConfig();
      } else if (type === 'blacklist') {
        this.blacklist = { ...this.blacklist, ...config };
        await this.saveBlacklistConfig();
      } else if (type === 'geo') {
        this.geoRules = { ...this.geoRules, ...config };
        await this.saveGeoRulesConfig();
      }

      // 清理缓存以确保新配置生效
      this.ipCache.clear();

      return true;
    } catch (error) {
      console.error('更新配置失败:', error);
      return false;
    }
  }

  /**
   * 保存白名单配置
   */
  async saveWhitelistConfig() {
    try {
      await fs.writeFile(
        this.config.whitelistFile,
        JSON.stringify(this.whitelist, null, 2)
      );
    } catch (error) {
      console.error('保存白名单配置失败:', error);
    }
  }

  /**
   * 保存黑名单配置
   */
  async saveBlacklistConfig() {
    try {
      await fs.writeFile(
        this.config.blacklistFile,
        JSON.stringify(this.blacklist, null, 2)
      );
    } catch (error) {
      console.error('保存黑名单配置失败:', error);
    }
  }

  /**
   * 保存地理位置规则配置
   */
  async saveGeoRulesConfig() {
    try {
      await fs.writeFile(
        this.config.geoIPFile,
        JSON.stringify(this.geoRules, null, 2)
      );
    } catch (error) {
      console.error('保存地理位置规则配置失败:', error);
    }
  }
}

module.exports = new IPWhitelistManager();