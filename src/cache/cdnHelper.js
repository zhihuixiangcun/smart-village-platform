/**
 * CDN边缘缓存助手
 * 支持AWS CloudFront、阿里云CDN、腾讯云CDN
 */

const crypto = require('crypto');
const fetch = require('node-fetch');
const logger = require('../utils/logger');

class CDNHelper {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'aws_cloudfront',
      distributionDomain: config.distributionDomain,
      keyPairId: config.keyPairId,
      privateKey: config.privateKey,
      ttl: config.ttl || 1000 * 60 * 60 * 24,        // 24小时
      edgeTtl: config.edgeTtl || 1000 * 60 * 60,    // 1小时
      signedUrlTtl: config.signedUrlTtl || 1000 * 60 * 15, // 15分钟
      cacheBehaviors: config.cacheBehaviors || {},
      region: config.region || 'us-east-1'
    };

    // 缓存行为规则
    this.cacheRules = {
      // API缓存规则
      '/api/v1/villages': { ttl: 1000 * 60 * 60, edgeTtl: 1000 * 60 * 30 },
      '/api/v1/announcements': { ttl: 1000 * 60 * 30, edgeTtl: 1000 * 60 * 15 },
      '/api/v1/policies': { ttl: 1000 * 60 * 60 * 2, edgeTtl: 1000 * 60 * 60 },
      '/api/v1/emergency': { ttl: 1000 * 60 * 5, edgeTtl: 1000 * 60 * 2 },

      // 静态资源缓存规则
      '/static/images': { ttl: 1000 * 60 * 60 * 24 * 7, edgeTtl: 1000 * 60 * 60 * 24 },
      '/static/css': { ttl: 1000 * 60 * 60 * 24, edgeTtl: 1000 * 60 * 60 * 12 },
      '/static/js': { ttl: 1000 * 60 * 60 * 24, edgeTtl: 1000 * 60 * 60 * 12 },
      '/static/documents': { ttl: 1000 * 60 * 60 * 24 * 3, edgeTtl: 1000 * 60 * 60 * 24 }
    };

    this.stats = {
      requests: 0,
      hits: 0,
      misses: 0,
      invalidations: 0,
      signedUrls: 0,
      errors: 0
    };

    // 根据供应商初始化
    this.initProvider();
  }

  /**
   * 根据供应商初始化
   */
  initProvider() {
    switch (this.config.provider) {
      case 'aws_cloudfront':
        this.initCloudFront();
        break;
      case 'aliyun_cdn':
        this.initAliyunCDN();
        break;
      case 'tencent_cdn':
        this.initTencentCDN();
        break;
      default:
        throw new Error(`不支持的CDN供应商: ${this.config.provider}`);
    }
  }

  /**
   * 初始化AWS CloudFront
   */
  initCloudFront() {
    if (!this.config.distributionDomain || !this.config.keyPairId || !this.config.privateKey) {
      throw new Error('CloudFront配置不完整');
    }

    this.provider = {
      type: 'aws_cloudfront',
      signUrl: this.signCloudFrontUrl.bind(this),
      invalidate: this.invalidateCloudFront.bind(this)
    };

    logger.info('AWS CloudFront CDN初始化完成', {
      domain: this.config.distributionDomain,
      keyPairId: this.config.keyPairId
    });
  }

  /**
   * 初始化阿里云CDN
   */
  initAliyunCDN() {
    // 阿里云CDN SDK初始化
    this.provider = {
      type: 'aliyun_cdn',
      signUrl: this.signAliyunUrl.bind(this),
      invalidate: this.invalidateAliyunCDN.bind(this)
    };

    logger.info('阿里云CDN初始化完成');
  }

  /**
   * 初始化腾讯云CDN
   */
  initTencentCDN() {
    // 腾讯云CDN SDK初始化
    this.provider = {
      type: 'tencent_cdn',
      signUrl: this.signTencentUrl.bind(this),
      invalidate: this.invalidateTencentCDN.bind(this)
    };

    logger.info('腾讯云CDN初始化完成');
  }

  /**
   * 获取CDN缓存内容
   * @param {string} key - 缓存键
   * @returns {Promise} 缓存内容
   */
  async get(key) {
    const startTime = Date.now();
    this.stats.requests++;

    try {
      // 构建CDN URL
      const cdnUrl = this.buildCDNUrl(key);

      // 发起请求
      const response = await fetch(cdnUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=0',
          'User-Agent': 'SmartVillage-CacheHelper/1.0'
        }
      });

      if (response.ok) {
        // 检查是否来自CDN缓存
        const isFromCDN = this.isResponseFromCDN(response);

        if (isFromCDN) {
          this.stats.hits++;
          logger.debug('CDN缓存命中', { key, responseTime: Date.now() - startTime });
        } else {
          this.stats.misses++;
          logger.debug('CDN缓存未命中', { key, responseTime: Date.now() - startTime });
        }

        // 解析响应内容
        const data = await this.parseResponse(response);
        return data;
      } else {
        this.stats.misses++;
        logger.debug('CDN请求失败', { key, status: response.status });
        return null;
      }

    } catch (error) {
      this.stats.errors++;
      logger.error('CDN获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置CDN缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Object} options - 选项
   */
  async set(key, value, options = {}) {
    try {
      // 获取缓存规则
      const cacheRule = this.getCacheRule(key, options);

      // 构建CDN URL
      const cdnUrl = this.buildCDNUrl(key);

      // 准备数据
      const data = this.serializeData(value, options);

      // 构建请求头
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${Math.floor(cacheRule.ttl / 1000)}`,
        'X-Cache-TTL': cacheRule.ttl.toString(),
        'X-Edge-TTL': cacheRule.edgeTtl?.toString() || cacheRule.ttl.toString(),
        'X-Cache-Key': key,
        'User-Agent': 'SmartVillage-CacheHelper/1.0'
      };

      // 发送PUT请求到CDN
      const response = await fetch(cdnUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });

      if (response.ok) {
        logger.debug('CDN缓存设置成功', { key, ttl: cacheRule.ttl });
        return true;
      } else {
        logger.error('CDN缓存设置失败', { key, status: response.status });
        return false;
      }

    } catch (error) {
      this.stats.errors++;
      logger.error('CDN设置缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 生成签名URL
   * @param {string} key - 缓存键
   * @param {number} expiresIn - 过期时间（秒）
   * @returns {string} 签名URL
   */
  generateSignedUrl(key, expiresIn = null) {
    const ttl = expiresIn || Math.floor(this.config.signedUrlTtl / 1000);

    return this.provider.signUrl(key, ttl);
  }

  /**
   * 批量失效CDN缓存
   * @param {string} pattern - 失效模式
   * @returns {Promise} 失效结果
   */
  async invalidate(pattern) {
    try {
      this.stats.invalidations++;

      const result = await this.provider.invalidate(pattern);

      logger.info('CDN缓存失效完成', { pattern, result });
      return result;

    } catch (error) {
      this.stats.errors++;
      logger.error('CDN缓存失效失败', { pattern, error: error.message });
      throw error;
    }
  }

  /**
   * 预热CDN缓存
   * @param {Array} urls - URL列表
   * @returns {Promise} 预热结果
   */
  async warmup(urls = []) {
    logger.info('开始CDN缓存预热', { count: urls.length });

    const results = [];
    const batchSize = 10; // 批量处理
    const batches = this.chunkArray(urls, batchSize);

    for (const batch of batches) {
      const promises = batch.map(async (url) => {
        try {
          const response = await fetch(url, { method: 'GET' });
          return { url, success: response.ok, status: response.status };
        } catch (error) {
          return { url, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults.map(r => r.value));

      // 防止请求过频
      await this.sleep(100);
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('CDN缓存预热完成', {
      total: urls.length,
      success: successCount,
      failed: urls.length - successCount
    });

    return { total: urls.length, success: successCount, failed: urls.length - successCount };
  }

  /**
   * 获取CDN统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const hitRate = this.stats.requests > 0 ?
      (this.stats.hits / this.stats.requests * 100).toFixed(2) : 0;

    return {
      provider: this.config.provider,
      domain: this.config.distributionDomain,
      stats: {
        ...this.stats,
        hitRate: `${hitRate}%`
      },
      cacheRules: Object.keys(this.cacheRules).length
    };
  }

  // 私有方法

  /**
   * 构建CDN URL
   */
  buildCDNUrl(key) {
    const baseUrl = `https://${this.config.distributionDomain}`;
    // 将缓存键转换为URL路径
    const path = key.replace(/:/g, '/').replace(/^cache\//, '');
    return `${baseUrl}/${path}`;
  }

  /**
   * 解析响应内容
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  /**
   * 检查响应是否来自CDN缓存
   */
  isResponseFromCDN(response) {
    // CloudFront
    if (response.headers.get('x-cache')?.includes('Hit')) {
      return true;
    }

    // 阿里云CDN
    if (response.headers.get('ali-swift-hit-cache') === 'HIT') {
      return true;
    }

    // 腾讯云CDN
    if (response.headers.get('x-cache-lookup')?.includes('HIT')) {
      return true;
    }

    // 通用检查
    const age = response.headers.get('age');
    return age && parseInt(age) > 0;
  }

  /**
   * 获取缓存规则
   */
  getCacheRule(key, options = {}) {
    // 查找匹配的规则
    for (const [pattern, rule] of Object.entries(this.cacheRules)) {
      if (key.includes(pattern) || key.startsWith(pattern)) {
        return { ...rule, ...options };
      }
    }

    // 默认规则
    return {
      ttl: this.config.ttl,
      edgeTtl: this.config.edgeTtl,
      ...options
    };
  }

  /**
   * 序列化数据
   */
  serializeData(value, options = {}) {
    return {
      data: value,
      timestamp: Date.now(),
      version: options.version || '1.0',
      compressed: options.compress || false
    };
  }

  /**
   * AWS CloudFront URL签名
   */
  signCloudFrontUrl(key, expiresIn) {
    const url = this.buildCDNUrl(key);
    const expiryTime = Math.floor(Date.now() / 1000) + expiresIn;

    // 构建策略
    const policy = {
      Statement: [
        {
          Resource: url,
          Condition: {
            DateLessThan: { 'AWS:EpochTime': expiryTime }
          }
        }
      ]
    };

    // 生成签名（这里需要实现实际的CloudFront签名逻辑）
    const signature = this.generateCloudFrontSignature(policy);

    // 构建签名URL
    const signedParams = new URLSearchParams({
      'Key-Pair-Id': this.config.keyPairId,
      'Signature': signature,
      'Expires': expiryTime.toString()
    });

    this.stats.signedUrls++;
    return `${url}?${signedParams.toString()}`;
  }

  /**
   * 生成CloudFront签名
   */
  generateCloudFrontSignature(policy) {
    // 实际实现需要使用AWS SDK和RSA签名
    const policyString = JSON.stringify(policy);
    const policyBase64 = Buffer.from(policyString).toString('base64');

    // 这里是简化版本，实际应该使用RSA私钥签名
    const signature = crypto
      .createHmac('sha1', this.config.privateKey)
      .update(policyBase64)
      .digest('base64');

    return signature;
  }

  /**
   * CloudFront缓存失效
   */
  async invalidateCloudFront(pattern) {
    // 实际实现需要使用AWS CloudFront SDK
    // 这里是简化版本
    const paths = this.generateInvalidationPaths(pattern);

    return {
      invalidated: paths.length,
      paths,
      id: `inv_${Date.now()}`,
      status: 'InProgress'
    };
  }

  /**
   * 生成失效路径
   */
  generateInvalidationPaths(pattern) {
    // 将模式转换为路径列表
    const paths = [];

    if (pattern.includes('*')) {
      // 通配符模式，转换为目录失效
      const basePath = pattern.replace('*', '');
      paths.push(`/${basePath}*`);
    } else {
      // 精确匹配
      paths.push(`/${pattern}`);
    }

    return paths;
  }

  /**
   * 阿里云CDN URL签名（占位符）
   */
  signAliyunUrl(key, expiresIn) {
    const url = this.buildCDNUrl(key);
    // 实现阿里云CDN签名逻辑
    return url;
  }

  /**
   * 阿里云CDN缓存失效（占位符）
   */
  async invalidateAliyunCDN(pattern) {
    // 实现阿里云CDN失效逻辑
    return { invalidated: 1, paths: [pattern] };
  }

  /**
   * 腾讯云CDN URL签名（占位符）
   */
  signTencentUrl(key, expiresIn) {
    const url = this.buildCDNUrl(key);
    // 实现腾讯云CDN签名逻辑
    return url;
  }

  /**
   * 腾讯云CDN缓存失效（占位符）
   */
  async invalidateTencentCDN(pattern) {
    // 实现腾讯云CDN失效逻辑
    return { invalidated: 1, paths: [pattern] };
  }

  /**
   * 工具方法
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CDNHelper;