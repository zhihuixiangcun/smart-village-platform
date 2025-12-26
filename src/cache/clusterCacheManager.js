/**
 * Smart Village Platform - Redis Cluster Cache Manager
 * High-performance cache manager with Redis Cluster support
 *
 * Features:
 * - Redis Cluster support with automatic failover
 * - MessagePack serialization for better performance
 * - Smart key routing and distribution
 * - Built-in circuit breaker and retry logic
 * - Comprehensive monitoring and metrics
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const msgpack = require('msgpack-lite');
const crypto = require('crypto');

class ClusterCacheManager {
  constructor(options = {}) {
    this.options = {
      // L1 Cache (Memory)
      l1Enabled: options.l1Enabled !== false,
      l1StdTTL: options.l1StdTTL || 300,        // 5 minutes
      l1CheckPeriod: options.l1CheckPeriod || 120,
      l1MaxSize: options.l1MaxSize || 100,     // Max items in L1

      // L2 Cache (Redis Cluster)
      l2Enabled: options.l2Enabled !== false,
      l2StdTTL: options.l2StdTTL || 1800,       // 30 minutes
      l2ConnectTimeout: options.l2ConnectTimeout || 10000,
      l2MaxRetriesPerRequest: options.l2MaxRetriesPerRequest || 3,

      // Key prefix
      keyPrefix: options.keyPrefix || 'sv:cache',

      // Compression
      compressionThreshold: options.compressionThreshold || 1024, // bytes

      // Circuit breaker
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerResetTimeout: options.circuitBreakerResetTimeout || 60000,

      // Monitoring
      enableMetrics: options.enableMetrics !== false,
      metricsInterval: options.metricsInterval || 60000,

      // Redis Cluster nodes
      clusterNodes: options.clusterNodes || [
        { host: process.env.REDIS_CLUSTER_NODE_1 || 'localhost', port: 7001 },
        { host: process.env.REDIS_CLUSTER_NODE_2 || 'localhost', port: 7002 },
        { host: process.env.REDIS_CLUSTER_NODE_3 || 'localhost', port: 7003 },
      ],
      ...options
    };

    // Initialize L1 cache
    this.l1Cache = new NodeCache({
      stdTTL: this.options.l1StdTTL,
      checkperiod: this.options.l1CheckPeriod,
      useClones: false,
      maxKeys: this.options.l1MaxSize
    });

    // Initialize L2 Redis Cluster
    this.l2Cluster = null;
    this.l2Ready = false;

    // Circuit breaker state
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null
    };

    // Metrics
    this.metrics = {
      hits: { l1: 0, l2: 0, total: 0 },
      misses: { l1: 0, l2: 0, total: 0 },
      errors: { l1: 0, l2: 0, total: 0 },
      sets: { l1: 0, l2: 0, total: 0 },
      deletes: { l1: 0, l2: 0, total: 0 },
      latencies: []
    };

    this._initializeL2();
    this._startMetricsReporter();
  }

  /**
   * Initialize Redis Cluster connection
   * @private
   */
  async _initializeL2() {
    if (!this.options.l2Enabled) {
      console.log('[ClusterCacheManager] L2 cache disabled');
      return;
    }

    try {
      this.l2Cluster = new Redis.Cluster(this.options.clusterNodes, {
        redisOptions: {
          connectTimeout: this.options.l2ConnectTimeout,
          maxRetriesPerRequest: this.options.l2MaxRetriesPerRequest,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          enableReadyCheck: true,
          enableOfflineQueue: true
        },
        clusterRetryStrategy: (times) => {
          const delay = Math.min(times * 100, 2000);
          return delay;
        },
        natMap: {}, // NAT mapping for Docker
        scaleReads: 'slave', // Read from replicas
        maxRetriesPerRequest: 3
      });

      this.l2Cluster.on('connect', () => {
        console.log('[ClusterCacheManager] Redis Cluster connecting...');
      });

      this.l2Cluster.on('ready', () => {
        this.l2Ready = true;
        console.log('[ClusterCacheManager] Redis Cluster ready');
      });

      this.l2Cluster.on('error', (err) => {
        console.error('[ClusterCacheManager] Redis Cluster error:', err.message);
        this._recordError('l2');
      });

      this.l2Cluster.on('close', () => {
        this.l2Ready = false;
        console.log('[ClusterCacheManager] Redis Cluster connection closed');
      });

      this.l2Cluster.on('reconnecting', () => {
        console.log('[ClusterCacheManager] Redis Cluster reconnecting...');
      });

      this.l2Cluster.on('+node', (node) => {
        console.log(`[ClusterCacheManager] Node joined: ${node.options.host}:${node.options.port}`);
      });

      this.l2Cluster.on('-node', (node) => {
        console.log(`[ClusterCacheManager] Node left: ${node.options.host}:${node.options.port}`);
      });

      // Wait for cluster to be ready
      await this.l2Cluster.ready();
      this.l2Ready = true;

    } catch (error) {
      console.error('[ClusterCacheManager] Failed to initialize Redis Cluster:', error.message);
      this._recordError('l2');
    }
  }

  /**
   * Generate cache key with prefix
   * @param {string} key - Raw key
   * @returns {string} Prefixed key
   * @private
   */
  _generateKey(key) {
    // Hash the key if it's too long
    if (key.length > 100) {
      const hash = crypto.createHash('md5').update(key).digest('hex');
      return `${this.options.keyPrefix}:${hash}`;
    }
    return `${this.options.keyPrefix}:${key}`;
  }

  /**
   * Serialize value using MessagePack
   * @param {*} value - Value to serialize
   * @returns {Buffer} Serialized buffer
   * @private
   */
  _serialize(value) {
    try {
      return msgpack.encode(value);
    } catch (error) {
      // Fallback to JSON
      return Buffer.from(JSON.stringify(value));
    }
  }

  /**
   * Deserialize buffer using MessagePack
   * @param {Buffer} buffer - Buffer to deserialize
   * @returns {*} Deserialized value
   * @private
   */
  _deserialize(buffer) {
    if (!buffer || buffer.length === 0) {
      return null;
    }

    try {
      return msgpack.decode(buffer);
    } catch (error) {
      // Fallback to JSON
      try {
        return JSON.parse(buffer.toString());
      } catch (jsonError) {
        return buffer.toString();
      }
    }
  }

  /**
   * Check if circuit breaker is open
   * @returns {boolean}
   * @private
   */
  _isCircuitBreakerOpen() {
    if (this.circuitBreaker.isOpen) {
      if (Date.now() >= this.circuitBreaker.nextAttemptTime) {
        // Try to close circuit breaker
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record circuit breaker failure
   * @private
   */
  _recordFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.options.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextAttemptTime = Date.now() + this.options.circuitBreakerResetTimeout;
      console.warn('[ClusterCacheManager] Circuit breaker opened');
    }
  }

  /**
   * Record cache hit
   * @param {string} level - Cache level (l1 or l2)
   * @private
   */
  _recordHit(level) {
    this.metrics.hits[level]++;
    this.metrics.hits.total++;
  }

  /**
   * Record cache miss
   * @param {string} level - Cache level (l1 or l2)
   * @private
   */
  _recordMiss(level) {
    this.metrics.misses[level]++;
    this.metrics.misses.total++;
  }

  /**
   * Record cache error
   * @param {string} level - Cache level (l1 or l2)
   * @private
   */
  _recordError(level) {
    this.metrics.errors[level]++;
    this.metrics.errors.total++;
  }

  /**
   * Start metrics reporter
   * @private
   */
  _startMetricsReporter() {
    if (!this.options.enableMetrics) return;

    setInterval(() => {
      const totalRequests = this.metrics.hits.total + this.metrics.misses.total;
      const hitRate = totalRequests > 0
        ? ((this.metrics.hits.total / totalRequests) * 100).toFixed(2)
        : 0;

      console.log('[ClusterCacheManager] Metrics:', {
        hitRate: `${hitRate}%`,
        hits: this.metrics.hits.total,
        misses: this.metrics.misses.total,
        errors: this.metrics.errors.total,
        l1Keys: this.l1Cache.getKeys().length,
        l2Ready: this.l2Ready
      });

      // Reset latency metrics
      this.metrics.latencies = [];

    }, this.options.metricsInterval);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @param {Object} options - Options
   * @returns {Promise<*>} Cached value or null
   */
  async get(key, options = {}) {
    const startTime = Date.now();
    const cacheKey = this._generateKey(key);

    // Try L1 cache first
    if (this.options.l1Enabled) {
      try {
        const l1Value = this.l1Cache.get(cacheKey);
        if (l1Value !== undefined) {
          this._recordHit('l1');
          return l1Value;
        }
        this._recordMiss('l1');
      } catch (error) {
        this._recordError('l1');
      }
    }

    // Try L2 cache
    if (this.options.l2Enabled && this.l2Ready && !this._isCircuitBreakerOpen()) {
      try {
        const l2Value = await this.l2Cluster.getBuffer(cacheKey);
        if (l2Value) {
          const deserialized = this._deserialize(l2Value);

          // Populate L1 cache
          if (this.options.l1Enabled && options.populateL1 !== false) {
            this.l1Cache.set(cacheKey, deserialized);
          }

          this._recordHit('l2');
          return deserialized;
        }
        this._recordMiss('l2');
      } catch (error) {
        this._recordError('l2');
        this._recordFailure();
      }
    }

    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in seconds
   * @param {Object} options - Options
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null, options = {}) {
    const cacheKey = this._generateKey(key);
    const finalTtl = ttl || this.options.l2StdTTL;
    const serialized = this._serialize(value);

    // Set in L1
    if (this.options.l1Enabled) {
      try {
        const l1Ttl = Math.min(finalTtl, this.options.l1StdTTL);
        this.l1Cache.set(cacheKey, value, l1Ttl);
        this.metrics.sets.l1++;
      } catch (error) {
        this._recordError('l1');
      }
    }

    // Set in L2
    if (this.options.l2Enabled && this.l2Ready && !this._isCircuitBreakerOpen()) {
      try {
        await this.l2Cluster.set(cacheKey, serialized, 'EX', finalTtl);
        this.metrics.sets.l2++;
        this.metrics.sets.total++;
        return true;
      } catch (error) {
        this._recordError('l2');
        this._recordFailure();
      }
    }

    this.metrics.sets.total++;
    return false;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    const cacheKey = this._generateKey(key);

    // Delete from L1
    if (this.options.l1Enabled) {
      this.l1Cache.del(cacheKey);
      this.metrics.deletes.l1++;
    }

    // Delete from L2
    if (this.options.l2Enabled && this.l2Ready) {
      try {
        await this.l2Cluster.del(cacheKey);
        this.metrics.deletes.l2++;
        this.metrics.deletes.total++;
        return true;
      } catch (error) {
        this._recordError('l2');
      }
    }

    this.metrics.deletes.total++;
    return false;
  }

  /**
   * Get multiple values
   * @param {string[]} keys - Array of keys
   * @returns {Promise<Array>} Array of values
   */
  async mget(keys) {
    const results = await Promise.all(
      keys.map(key => this.get(key))
    );
    return results;
  }

  /**
   * Set multiple values
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(keyValuePairs, ttl = null) {
    const results = await Promise.all(
      Object.entries(keyValuePairs).map(([key, value]) => this.set(key, value, ttl))
    );
    return results.every(r => r);
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success status
   */
  async flush() {
    // Clear L1
    if (this.options.l1Enabled) {
      this.l1Cache.flushAll();
    }

    // Clear L2 (only keys with our prefix)
    if (this.options.l2Enabled && this.l2Ready) {
      try {
        const pattern = `${this.options.keyPrefix}:*`;
        const keys = await this.l2Cluster.keys(pattern);
        if (keys.length > 0) {
          await this.l2Cluster.del(...keys);
        }
        return true;
      } catch (error) {
        this._recordError('l2');
      }
    }

    return false;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.metrics.hits.total + this.metrics.misses.total;
    const hitRate = totalRequests > 0
      ? (this.metrics.hits.total / totalRequests) * 100
      : 0;

    return {
      hitRate: hitRate.toFixed(2) + '%',
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      l1Keys: this.l1Cache.getKeys().length,
      l2Ready: this.l2Ready,
      circuitBreakerOpen: this.circuitBreaker.isOpen
    };
  }

  /**
   * Ping Redis cluster
   * @returns {Promise<string>} PONG
   */
  async ping() {
    if (this.l2Ready && this.l2Cluster) {
      return await this.l2Cluster.ping();
    }
    throw new Error('Redis Cluster not ready');
  }

  /**
   * Get cluster info
   * @returns {Promise<Object>} Cluster information
   */
  async getClusterInfo() {
    if (this.l2Ready && this.l2Cluster) {
      const info = await this.l2Cluster.cluster('info');
      const nodes = await this.l2Cluster.cluster('nodes');
      return { info, nodes };
    }
    throw new Error('Redis Cluster not ready');
  }

  /**
   * Disconnect from cluster
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.l2Cluster) {
      await this.l2Cluster.quit();
      this.l2Cluster = null;
      this.l2Ready = false;
    }
    if (this.l1Cache) {
      this.l1Cache.close();
    }
  }
}

// Export singleton instance
let clusterCacheManager = null;

function getClusterCacheManager(options) {
  if (!clusterCacheManager) {
    clusterCacheManager = new ClusterCacheManager(options);
  }
  return clusterCacheManager;
}

module.exports = {
  ClusterCacheManager,
  getClusterCacheManager
};
