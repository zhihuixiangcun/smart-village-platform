/**
 * Smart Village Platform - Tenant Service
 * 智慧乡村综合服务平台 - 租户服务
 *
 * Purpose:
 * - Central service for tenant management operations
 * - Tenant lifecycle management (create, update, suspend, delete)
 * - Subscription management integration
 * - Quota enforcement and usage tracking
 * - Tenant hierarchy operations
 *
 * @module smart-village/services/tenantService
 */

const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
const { getClusterCacheManager } = require('./cache/clusterCacheManager');
const tenantIsolation = require('../middleware/tenantIsolation');
const logger = require('../utils/logger');

// Get cache manager
let cacheManager;
try {
  cacheManager = getClusterCacheManager();
} catch (error) {
  logger.warn('[TenantService] Cache manager not available:', error.message);
  cacheManager = null;
}

// Cache prefix for tenant data
const CACHE_PREFIX = 'tenant:';
const CACHE_TTL = 300; // 5 minutes

/**
 * Tenant Service Class
 */
class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(data, creatorId) {
    try {
      // Validate required fields
      const required = ['code', 'name', 'type'];
      for (const field of required) {
        if (!data[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Check if tenant code already exists
      const existing = await Tenant.findByCode(data.code);
      if (existing) {
        throw new Error('租户代码已存在');
      }

      // Validate parent if provided
      if (data.parentId) {
        const parent = await Tenant.findByCode(data.parentId);
        if (!parent) {
          throw new Error('父级租户不存在');
        }

        // Validate hierarchy level
        if (parent.level >= 5) {
          throw new Error('无法在村级下创建子级租户');
        }
      }

      // Create tenant
      const tenant = new Tenant({
        ...data,
        status: data.status || 'pending',
        createdBy: creatorId,
        updatedBy: creatorId
      });

      // Update path based on parent
      await tenant.updatePath();

      await tenant.save();

      // Create initial subscription if provided
      if (data.subscription) {
        await this.createSubscriptionForTenant(tenant._id, data.subscription, creatorId);
      } else {
        // Create default trial subscription
        await this.createDefaultSubscription(tenant._id, creatorId);
      }

      // Clear cache
      this.clearCache(tenant._id.toString());

      logger.debug(`[TenantService] Created tenant: ${tenant.code}`);
      return tenant;
    } catch (error) {
      logger.error('[TenantService] Create tenant error:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId) {
    try {
      // Try cache first
      const cacheKey = `${CACHE_PREFIX}${tenantId}`;
      if (cacheManager) {
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Fetch from database
      const tenant = await Tenant.findById(tenantId)
        .populate('subscription')
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email');

      if (!tenant) {
        return null;
      }

      // Cache the result
      if (cacheManager) {
        await cacheManager.set(cacheKey, JSON.stringify(tenant), CACHE_TTL);
      }

      return tenant;
    } catch (error) {
      logger.error('[TenantService] Get tenant error:', error);
      throw error;
    }
  }

  /**
   * Get tenant by code
   */
  async getTenantByCode(code) {
    try {
      const tenant = await Tenant.findByCode(code)
        .populate('subscription')
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email');

      return tenant;
    } catch (error) {
      logger.error('[TenantService] Get tenant by code error:', error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId, updates, updaterId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'createdAt' && key !== 'createdBy') {
          tenant[key] = updates[key];
        }
      });

      tenant.updatedBy = updaterId;
      await tenant.save();

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Updated tenant: ${tenant.code}`);
      return tenant;
    } catch (error) {
      logger.error('[TenantService] Update tenant error:', error);
      throw error;
    }
  }

  /**
   * Activate tenant
   */
  async activateTenant(tenantId, operatorId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      await tenant.activate();

      // Also activate subscription if exists
      if (tenant.subscriptionId) {
        const subscription = await Subscription.findById(tenant.subscriptionId);
        if (subscription && subscription.status === 'pending') {
          subscription.status = 'active';
          await subscription.save();
        }
      }

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Activated tenant: ${tenant.code}`);
      return tenant;
    } catch (error) {
      logger.error('[TenantService] Activate tenant error:', error);
      throw error;
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason, operatorId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      await tenant.suspend(reason);

      // Also suspend subscription
      if (tenant.subscriptionId) {
        const subscription = await Subscription.findById(tenant.subscriptionId);
        if (subscription && subscription.status === 'active') {
          await subscription.suspend();
        }
      }

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Suspended tenant: ${tenant.code}, reason: ${reason}`);
      return tenant;
    } catch (error) {
      logger.error('[TenantService] Suspend tenant error:', error);
      throw error;
    }
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(tenantId, operatorId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      // Check if tenant has children
      const children = await Tenant.findByParent(tenant.code);
      if (children.length > 0) {
        throw new Error('无法删除包含子级租户的租户，请先删除所有子级租户');
      }

      await tenant.softDelete(operatorId);

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Deleted tenant: ${tenant.code}`);
      return tenant;
    } catch (error) {
      logger.error('[TenantService] Delete tenant error:', error);
      throw error;
    }
  }

  /**
   * Restore tenant
   */
  async restoreTenant(tenantId, operatorId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      await tenant.restore();

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Restored tenant: ${tenant.code}`);
      return tenant;
    } catch (error) {
      logger.error('[TenantService] Restore tenant error:', error);
      throw error;
    }
  }

  /**
   * List tenants with filters
   */
  async listTenants(filters = {}, options = {}) {
    try {
      const {
        status,
        type,
        parentId,
        level,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = options;

      // Build query
      const query = { deletedAt: null };

      if (status) query.status = status;
      if (type) query.type = type;
      if (parentId) query.parentId = parentId;
      if (level) query.level = level;

      // Search in name or code
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') }
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [tenants, total] = await Promise.all([
        Tenant.find(query)
          .populate('subscription')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Tenant.countDocuments(query)
      ]);

      return {
        data: tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('[TenantService] List tenants error:', error);
      throw error;
    }
  }

  /**
   * Get tenant hierarchy
   */
  async getTenantHierarchy(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      const [ancestors, descendants] = await Promise.all([
        tenant.getAncestors(),
        tenant.getDescendants()
      ]);

      return {
        tenant,
        ancestors,
        descendants
      };
    } catch (error) {
      logger.error('[TenantService] Get hierarchy error:', error);
      throw error;
    }
  }

  /**
   * Update tenant usage statistics
   */
  async updateUsage(tenantId, usageUpdates) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      await tenant.updateUsage(usageUpdates);

      // Clear cache
      this.clearCache(tenantId);

      return tenant;
    } catch (error) {
      logger.error('[TenantService] Update usage error:', error);
      throw error;
    }
  }

  /**
   * Check if tenant quota is exceeded
   */
  async checkQuota(tenantId, quotaType) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      return tenant.isQuotaExceeded(quotaType);
    } catch (error) {
      logger.error('[TenantService] Check quota error:', error);
      throw error;
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStatistics(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId)
        .populate('subscription');

      if (!tenant) {
        throw new Error('租户不存在');
      }

      // Get user count (would query User model)
      // Get storage usage (would query file storage)
      // Get API calls today (would query audit logs)

      return {
        tenant: {
          id: tenant._id,
          code: tenant.code,
          name: tenant.name,
          type: tenant.type,
          status: tenant.status
        },
        quota: tenant.quota,
        usage: tenant.usage,
        subscription: tenant.subscription ? {
          plan: tenant.subscription.plan,
          status: tenant.subscription.status,
          period: tenant.subscription.period,
          autoRenew: tenant.subscription.autoRenew
        } : null
      };
    } catch (error) {
      logger.error('[TenantService] Get statistics error:', error);
      throw error;
    }
  }

  /**
   * Create subscription for tenant
   */
  async createSubscriptionForTenant(tenantId, subscriptionData, creatorId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      // Check if subscription already exists
      if (tenant.subscriptionId) {
        throw new Error('租户已有订阅');
      }

      const subscription = new Subscription({
        tenantId,
        ...subscriptionData,
        createdBy: creatorId,
        updatedBy: creatorId
      });

      await subscription.save();

      // Link subscription to tenant
      tenant.subscriptionId = subscription._id;
      await tenant.save();

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Created subscription for tenant: ${tenant.code}`);
      return subscription;
    } catch (error) {
      logger.error('[TenantService] Create subscription error:', error);
      throw error;
    }
  }

  /**
   * Create default subscription for new tenant
   */
  async createDefaultSubscription(tenantId, creatorId) {
    const subscriptionData = {
      plan: 'basic',
      billingCycle: 'monthly',
      pricing: {
        basePrice: 298000, // 2980.00 in cents/fen
        currency: 'CNY'
      },
      period: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      status: 'trial',
      autoRenew: true
    };

    return this.createSubscriptionForTenant(tenantId, subscriptionData, creatorId);
  }

  /**
   * Get global tenant statistics
   */
  async getGlobalStatistics() {
    try {
      const stats = await Tenant.getStatistics();

      // Get subscription statistics
      const subscriptionStats = await Subscription.getStatistics();

      return {
        tenants: stats,
        subscriptions: subscriptionStats,
        totalRevenue: {
          mrr: subscriptionStats.mrr,
          arr: subscriptionStats.arr
        }
      };
    } catch (error) {
      logger.error('[TenantService] Get global statistics error:', error);
      throw error;
    }
  }

  /**
   * Search tenants
   */
  async searchTenants(searchTerm, options = {}) {
    try {
      const { limit = 10, type = null } = options;

      const query = {
        deletedAt: null,
        $or: [
          { name: new RegExp(searchTerm, 'i') },
          { code: new RegExp(searchTerm, 'i') },
          { 'location.province': new RegExp(searchTerm, 'i') },
          { 'location.city': new RegExp(searchTerm, 'i') }
        ]
      };

      if (type) {
        query.type = type;
      }

      const tenants = await Tenant.find(query)
        .limit(limit)
        .lean();

      return tenants;
    } catch (error) {
      logger.error('[TenantService] Search tenants error:', error);
      throw error;
    }
  }

  /**
   * Clear cache for tenant
   */
  clearCache(tenantId) {
    if (cacheManager) {
      tenantIsolation.clearTenantCache(tenantId);
      const cacheKey = `${CACHE_PREFIX}${tenantId}`;
      cacheManager.del(cacheKey).catch(err => {
        logger.error('[TenantService] Clear cache error:', err);
      });
    }
  }

  /**
   * Clear all tenant cache
   */
  clearAllCache() {
    if (cacheManager) {
      tenantIsolation.clearTenantCache();
    }
  }

  /**
   * Validate tenant access
   */
  async validateAccess(tenantId, userId, userRole) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return { valid: false, reason: '租户不存在' };
      }

      if (tenant.status !== 'active') {
        return { valid: false, reason: '租户未激活' };
      }

      // Check subscription
      if (tenant.subscriptionId) {
        const subscription = await Subscription.findById(tenant.subscriptionId);
        if (!subscription || !subscription.isActive) {
          return { valid: false, reason: '订阅无效或已过期' };
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error('[TenantService] Validate access error:', error);
      return { valid: false, reason: '验证失败' };
    }
  }

  /**
   * Get tenant children (direct descendants only)
   */
  async getTenantChildren(tenantCode) {
    try {
      const children = await Tenant.findByParent(tenantCode);
      return children;
    } catch (error) {
      logger.error('[TenantService] Get children error:', error);
      throw error;
    }
  }

  /**
   * Migrate tenant to new plan
   */
  async migrateTenant(tenantId, newPlan, newBillingCycle, operatorId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('租户不存在');
      }

      if (!tenant.subscriptionId) {
        throw new Error('租户没有订阅');
      }

      const subscription = await Subscription.findById(tenant.subscriptionId);
      if (!subscription) {
        throw new Error('订阅不存在');
      }

      // Change plan
      await subscription.changePlan(newPlan, newBillingCycle, 'Plan migration', operatorId);

      // Update tenant quota based on new plan
      const planDetails = subscription.getEffectiveQuota();
      tenant.quota = planDetails;
      await tenant.save();

      // Clear cache
      this.clearCache(tenantId);

      logger.debug(`[TenantService] Migrated tenant ${tenant.code} to ${newPlan}`);
      return { tenant, subscription };
    } catch (error) {
      logger.error('[TenantService] Migrate tenant error:', error);
      throw error;
    }
  }

  /**
   * Batch import tenants
   */
  async importTenants(tenantsData, creatorId) {
    try {
      const results = {
        successful: [],
        failed: []
      };

      for (const tenantData of tenantsData) {
        try {
          const tenant = await this.createTenant(tenantData, creatorId);
          results.successful.push({
            code: tenant.code,
            id: tenant._id
          });
        } catch (error) {
          results.failed.push({
            code: tenantData.code,
            error: error.message
          });
        }
      }

      logger.debug(`[TenantService] Imported ${results.successful.length}/${tenantsData.length} tenants`);
      return results;
    } catch (error) {
      logger.error('[TenantService] Import tenants error:', error);
      throw error;
    }
  }

  /**
   * Export tenant data
   */
  async exportTenant(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId)
        .populate('subscription')
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email');

      if (!tenant) {
        throw new Error('租户不存在');
      }

      // Get additional data
      const [hierarchy, statistics] = await Promise.all([
        this.getTenantHierarchy(tenantId),
        this.getTenantStatistics(tenantId)
      ]);

      return {
        tenant,
        hierarchy,
        statistics,
        exportedAt: new Date()
      };
    } catch (error) {
      logger.error('[TenantService] Export tenant error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const tenantService = new TenantService();

module.exports = tenantService;
