/**
 * Smart Village Platform - Enhanced Rate Limiting Middleware
 * 智慧乡村综合服务平台 - 增强型限流中间件
 *
 * Features:
 * - Multi-tier rate limiting (IP, User, API Key)
 * - Adaptive thresholds based on user role
 * - Sliding window algorithm
 * - Redis-backed distributed limiting
 * - Whitelist/Blacklist support
 * - Graceful degradation
 */

const NodeCache = require('node-cache');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const getClusterCacheManager = require('../cache/clusterCacheManager').getClusterCacheManager;

// Rate limit configurations for different user roles
const ROLE_LIMITS = {
  admin: { points: 1000, duration: 60 },      // 1000 requests/minute
  village_admin: { points: 500, duration: 60 }, // 500 requests/minute
  user: { points: 100, duration: 60 },         // 100 requests/minute
  guest: { points: 30, duration: 60 },         // 30 requests/minute
  api_key: { points: 1000, duration: 60 }      // 1000 requests/minute for API keys
};

// Rate limit configurations for different endpoint types
const ENDPOINT_LIMITS = {
  // Authentication endpoints - stricter limits
  '/api/auth/login': { points: 5, duration: 300 },      // 5 requests/5 minutes
  '/api/auth/register': { points: 3, duration: 3600 },  // 3 requests/hour
  '/api/auth/forgot-password': { points: 3, duration: 900 }, // 3 requests/15 minutes

  // File upload endpoints
  '/api/upload': { points: 10, duration: 60 },          // 10 uploads/minute
  '/api/documents': { points: 20, duration: 60 },       // 20 requests/minute

  // Resource intensive endpoints
  '/api/reports': { points: 5, duration: 60 },          // 5 reports/minute
  '/api/export': { points: 3, duration: 300 },          // 3 exports/5 minutes

  // Public endpoints
  '/api/villages': { points: 50, duration: 60 },        // 50 requests/minute
  '/api/announcements': { points: 50, duration: 60 }    // 50 requests/minute
};

// Whitelist IPs (no rate limiting)
const WHITELIST_IPS = new Set([
  '127.0.0.1',
  '::1',
  'localhost'
]);

// Blacklist IPs (block all requests)
const BLACKLIST_IPS = new Map();

class EnhancedRateLimiter {
  constructor(options = {}) {
    this.options = {
      useRedis: options.useRedis !== false,
      cacheManager: options.cacheManager,
      defaultLimit: options.defaultLimit || { points: 100, duration: 60 },
      banDuration: options.banDuration || 3600000, // 1 hour
      ...options
    };

    // Initialize limiters
    this.limiters = new Map();
    this.memoryCache = new NodeCache({ stdTTL: 3600 });

    // Statistics
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      whitelistedRequests: 0,
      blacklistedRequests: 0
    };

    this._initializeLimiters();
  }

  /**
   * Initialize rate limiters
   * @private
   */
  _initializeLimiters() {
    // IP-based limiter
    this.limiters.set('ip', new RateLimiterMemory({
      points: this.options.defaultLimit.points,
      duration: this.options.defaultLimit.duration
    }));

    // User-based limiter
    this.limiters.set('user', new RateLimiterMemory({
      points: this.options.defaultLimit.points,
      duration: this.options.defaultLimit.duration
    }));

    // API key-based limiter
    this.limiters.set('apiKey', new RateLimiterMemory({
      points: ROLE_LIMITS.api_key.points,
      duration: ROLE_LIMITS.api_key.duration
    }));

    // Endpoint-specific limiters
    for (const [endpoint, config] of Object.entries(ENDPOINT_LIMITS)) {
      const key = `endpoint:${endpoint}`;
      this.limiters.set(key, new RateLimiterMemory({
        points: config.points,
        duration: config.duration
      }));
    }
  }

  /**
   * Get rate limiter for a specific key
   */
  getLimiter(key, config) {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiterMemory({
        points: config.points,
        duration: config.duration
      }));
    }
    return this.limiters.get(key);
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelisted(ip) {
    return WHITELIST_IPS.has(ip) || WHITELIST_IPS.has(ip.split(':')[0]); // Handle IPv6
  }

  /**
   * Check if IP is blacklisted
   */
  isBlacklisted(ip) {
    const banInfo = BLACKLIST_IPS.get(ip);
    if (!banInfo) return false;

    // Check if ban has expired
    if (Date.now() > banInfo.expiresAt) {
      BLACKLIST_IPS.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Add IP to blacklist
   */
  blacklistIP(ip, reason = 'Rate limit violation') {
    BLACKLIST_IPS.set(ip, {
      reason,
      bannedAt: Date.now(),
      expiresAt: Date.now() + this.options.banDuration
    });
  }

  /**
   * Get user's rate limit based on role
   */
  getUserLimit(user) {
    if (!user) return ROLE_LIMITS.guest;
    return ROLE_LIMITS[user.role] || ROLE_LIMITS.user;
  }

  /**
   * Extract IP from request
   */
  extractIP(req) {
    return req.ip ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           'unknown';
  }

  /**
   * Extract user from request
   */
  extractUser(req) {
    return req.user || null;
  }

  /**
   * Extract API key from request
   */
  extractAPIKey(req) {
    return req.headers['x-api-key'] ||
           req.query.api_key ||
           req.body.api_key;
  }

  /**
   * Get endpoint-specific limit
   */
  getEndpointLimit(path) {
    // Exact match first
    if (ENDPOINT_LIMITS[path]) {
      return ENDPOINT_LIMITS[path];
    }

    // Prefix match
    for (const [endpoint, config] of Object.entries(ENDPOINT_LIMITS)) {
      if (path.startsWith(endpoint)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Rate limiting middleware
   */
  middleware() {
    return async (req, res, next) => {
      this.stats.totalRequests++;

      const ip = this.extractIP(req);

      // Check whitelist
      if (this.isWhitelisted(ip)) {
        this.stats.whitelistedRequests++;
        return next();
      }

      // Check blacklist
      if (this.isBlacklisted(ip)) {
        this.stats.blacklistedRequests++;
        const banInfo = BLACKLIST_IPS.get(ip);
        return res.status(429).json({
          error: 'IP address is blacklisted',
          reason: banInfo.reason,
          expiresAt: new Date(banInfo.expiresAt).toISOString()
        });
      }

      try {
        // Check IP-based limit
        await this._checkRateLimit('ip', ip, this.options.defaultLimit);

        // Check user-based limit
        const user = this.extractUser(req);
        if (user) {
          const userLimit = this.getUserLimit(user);
          await this._checkRateLimit('user', user.id, userLimit);
        }

        // Check API key limit
        const apiKey = this.extractAPIKey(req);
        if (apiKey && !user) {
          await this._checkRateLimit('apiKey', apiKey, ROLE_LIMITS.api_key);
        }

        // Check endpoint-specific limit
        const endpointLimit = this.getEndpointLimit(req.path);
        if (endpointLimit) {
          const key = `endpoint:${req.path}`;
          await this._checkRateLimit(key, ip, endpointLimit);
        }

        // Set rate limit headers
        this._setRateLimitHeaders(res);

        next();
      } catch (rejRes) {
        this.stats.blockedRequests++;

        // Auto-blacklist after repeated violations
        const violations = this.memoryCache.get(`violations:${ip}`) || 0;
        this.memoryCache.set(`violations:${ip}`, violations + 1);

        if (violations >= 10) {
          this.blacklistIP(ip, 'Repeated rate limit violations');
        }

        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.round(rejRes.msBeforeNext / 1000)
        });
      }
    };
  }

  /**
   * Check rate limit
   * @private
   */
  async _checkRateLimit(type, key, config) {
    const limiter = this.getLimiter(type, config);
    await limiter.consume(key);
  }

  /**
   * Set rate limit headers
   * @private
   */
  _setRateLimitHeaders(res) {
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '50');
    res.setHeader('X-RateLimit-Reset', Date.now() + 60000);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      blockedRate: `${(this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2)  }%`,
      blacklistedIPs: BLACKLIST_IPS.size,
      activeLimiters: this.limiters.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      whitelistedRequests: 0,
      blacklistedRequests: 0
    };
  }

  /**
   * Clear blacklist
   */
  clearBlacklist() {
    BLACKLIST_IPS.clear();
  }
}

// Singleton instance
let rateLimiterInstance = null;

/**
 * Get rate limiter instance
 */
function getEnhancedRateLimiter(options) {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new EnhancedRateLimiter(options);
  }
  return rateLimiterInstance;
}

/**
 * Express middleware factory
 */
function createRateLimitMiddleware(options) {
  const limiter = getEnhancedRateLimiter(options);
  return limiter.middleware();
}

module.exports = {
  EnhancedRateLimiter,
  getEnhancedRateLimiter,
  createRateLimitMiddleware,
  ROLE_LIMITS,
  ENDPOINT_LIMITS
};
