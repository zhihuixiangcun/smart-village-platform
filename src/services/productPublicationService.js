/**
 * 产品发布服务层
 * 处理产品发布相关的业务逻辑
 */

const { ProductPublication, ProductStatus, ProductCategories, PriceType } = require('../models/ProductPublication');
const Resident = require('../models/Resident');
const { auditLog } = require('../utils/audit');

class ProductPublicationService {
  /**
   * 创建产品发布
   */
  async createPublication(productData, publisherId) {
    try {
      // 验证发布者是否存在
      const publisher = await Resident.findById(publisherId);
      if (!publisher) {
        throw new Error('发布者不存在');
      }

      // 计算有效期截止时间
      const effectiveUntil = new Date();
      effectiveUntil.setDate(effectiveUntil.getDate() + (productData.validDays || 30));

      // 确定价格显示
      let price = productData.price;
      if (productData.priceType === PriceType.NEGOTIABLE) {
        price = 0;
      }

      // 创建产品发布记录
      const publication = new ProductPublication({
        ...productData,
        price,
        villageId: publisher.villageId,
        publisherId,
        publisherName: publisher.name,
        publisherPhone: publisher.phone,
        publisherVerified: true, // 假设已经过身份验证
        effectiveUntil,
        operationLogs: [{
          operatorId: publisherId,
          operatorName: publisher.name,
          operation: 'create',
          description: '创建产品发布',
          timestamp: new Date()
        }]
      });

      await publication.save();

      // 记录审计日志
      await auditLog(publisherId, 'CREATE', 'ProductPublication', publication._id, {
        action: '发布产品',
        productName: publication.productName,
        category: publication.categoryName
      });

      return publication;
    } catch (error) {
      throw new Error(`创建产品发布失败: ${error.message}`);
    }
  }

  /**
   * 获取产品列表（已发布且有效）
   */
  async getProductList(villageId, options = {}) {
    try {
      const products = await ProductPublication.getValidProducts(villageId, options);

      return products.map(product => ({
        id: product._id,
        productName: product.productName,
        category: product.categoryName,
        description: product.description.substring(0, 100) + (product.description.length > 100 ? '...' : ''),
        price: this._formatPrice(product),
        coverImage: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
        images: product.images.map(img => img.url),
        publisher: {
          name: product.publisherId?.name || '村民',
          phone: this._maskPhone(product.publisherId?.phone || product.publisherPhone)
        },
        location: product.contactAddress,
        publishedAt: product.publishedAt,
        remainingDays: Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24)),
        viewCount: product.viewCount,
        favoriteCount: product.favoriteCount,
        distance: product.distance // 如果是附近搜索
      }));
    } catch (error) {
      throw new Error(`获取产品列表失败: ${error.message}`);
    }
  }

  /**
   * 获取待审核产品列表
   */
  async getPendingList(villageId, options = {}) {
    try {
      const pending = await ProductPublication.getPendingProducts(villageId, options);

      return pending.map(product => ({
        id: product._id,
        productName: product.productName,
        category: product.categoryName,
        description: product.description,
        price: this._formatPrice(product),
        images: product.images,
        publisher: {
          id: product.publisherId?._id,
          name: product.publisherId?.name,
          phone: product.publisherId?.phone
        },
        verifyMethod: product.verifyMethod,
        publishedAt: product.publishedAt,
        effectiveUntil: product.effectiveUntil,
        validDays: product.validDays
      }));
    } catch (error) {
      throw new Error(`获取待审核列表失败: ${error.message}`);
    }
  }

  /**
   * 审核产品
   */
  async reviewProduct(productId, reviewerId, reviewerName, isApproved, remark = '') {
    try {
      const product = await ProductPublication.findById(productId);
      if (!product) {
        throw new Error('产品不存在');
      }

      if (product.status !== ProductStatus.PENDING && product.status !== ProductStatus.REVIEWING) {
        throw new Error(`产品当前状态为${product.status}，无法审核`);
      }

      let updatedProduct;
      if (isApproved) {
        updatedProduct = await product.approve(reviewerId, reviewerName, remark);
      } else {
        updatedProduct = await product.reject(reviewerId, reviewerName, remark);
      }

      // 记录审计日志
      await auditLog(reviewerId, isApproved ? 'APPROVE' : 'REJECT', 'ProductPublication', productId, {
        action: isApproved ? '审核通过' : '审核拒绝',
        productName: product.productName,
        remark
      });

      return updatedProduct;
    } catch (error) {
      throw new Error(`审核产品失败: ${error.message}`);
    }
  }

  /**
   * 下架产品
   */
  async offlineProduct(productId, operatorId, operatorName, reason = '') {
    try {
      const product = await ProductPublication.findById(productId);
      if (!product) {
        throw new Error('产品不存在');
      }

      if (product.status === ProductStatus.OFFLINE) {
        throw new Error('产品已下架');
      }

      await product.offline(operatorId, operatorName, reason);

      // 记录审计日志
      await auditLog(operatorId, 'OFFLINE', 'ProductPublication', productId, {
        action: '下架产品',
        productName: product.productName,
        reason
      });

      return product;
    } catch (error) {
      throw new Error(`下架产品失败: ${error.message}`);
    }
  }

  /**
   * 刷新产品
   */
  async refreshProduct(productId) {
    try {
      const product = await ProductPublication.findById(productId);
      if (!product) {
        throw new Error('产品不存在');
      }

      if (product.publisherId.toString() !== productId) {
        // 这里应该检查操作权限
        throw new Error('无权操作此产品');
      }

      await product.refresh();

      return product;
    } catch (error) {
      throw new Error(`刷新产品失败: ${error.message}`);
    }
  }

  /**
   * 删除产品
   */
  async deleteProduct(productId, operatorId) {
    try {
      const product = await ProductPublication.findById(productId);
      if (!product) {
        throw new Error('产品不存在');
      }

      // 检查权限（只有发布者或管理员可以删除）
      if (product.publisherId.toString() !== operatorId.toString()) {
        // 这里应该检查是否是管理员
        throw new Error('无权删除此产品');
      }

      product.isDeleted = true;
      product.deletedAt = new Date();
      product.deletedBy = operatorId;
      await product.save();

      // 记录审计日志
      await auditLog(operatorId, 'DELETE', 'ProductPublication', productId, {
        action: '删除产品',
        productName: product.productName
      });

      return product;
    } catch (error) {
      throw new Error(`删除产品失败: ${error.message}`);
    }
  }

  /**
   * 获取产品详情
   */
  async getProductDetail(productId, userId = null) {
    try {
      const product = await ProductPublication.findById(productId)
        .populate('publisherId', 'name phone')
        .populate('reviewerId', 'name')
        .lean();

      if (!product || product.isDeleted) {
        throw new Error('产品不存在');
      }

      // 增加浏览量
      await ProductPublication.findByIdAndUpdate(productId, {
        $inc: { viewCount: 1 }
      });

      // 检查是否已收藏
      const isFavorited = userId && product.favoritedBy.some(id => id.toString() === userId.toString());

      return {
        id: product._id,
        productName: product.productName,
        category: product.categoryName,
        description: product.description,
        price: this._formatPrice(product),
        priceType: product.priceType,
        priceUnit: product.priceUnit,
        images: product.images,
        publisher: {
          id: product.publisherId?._id,
          name: product.publisherId?.name,
          phone: this._maskPhone(product.publisherId?.phone || product.publisherPhone),
          verified: product.publisherVerified
        },
        contact: {
          phone: this._maskPhone(product.contactPhone),
          wechat: product.contactWechat,
          address: product.contactAddress
        },
        location: {
          district: product.district,
          coordinates: product.location?.coordinates
        },
        validity: {
          publishedAt: product.publishedAt,
          effectiveUntil: product.effectiveUntil,
          remainingDays: Math.max(0, Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24))),
          isExpiringSoon: Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24)) <= 3
        },
        stats: {
          viewCount: product.viewCount + 1,
          favoriteCount: product.favoriteCount,
          contactCount: product.contactCount,
          shareCount: product.shareCount
        },
        tags: product.tags,
        attributes: product.attributes,
        review: product.reviewerId ? {
          reviewer: product.reviewerId.name,
          reviewedAt: product.reviewedAt,
          remark: product.reviewRemark
        } : null,
        isFavorited
      };
    } catch (error) {
      throw new Error(`获取产品详情失败: ${error.message}`);
    }
  }

  /**
   * 获取我发布的产品
   */
  async getMyProducts(publisherId, options = {}) {
    try {
      const products = await ProductPublication.getMyProducts(publisherId, options);

      return products.map(product => ({
        id: product._id,
        productName: product.productName,
        category: product.categoryName,
        price: this._formatPrice(product),
        coverImage: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
        status: product.status,
        statusName: this._getStatusName(product.status),
        publishedAt: product.publishedAt,
        effectiveUntil: product.effectiveUntil,
        remainingDays: Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24)),
        viewCount: product.viewCount,
        favoriteCount: product.favoriteCount,
        isExpired: new Date() > product.effectiveUntil
      }));
    } catch (error) {
      throw new Error(`获取我的产品失败: ${error.message}`);
    }
  }

  /**
   * 收藏/取消收藏产品
   */
  async toggleFavorite(productId, userId, isFavorite) {
    try {
      const product = await ProductPublication.findById(productId);
      if (!product || product.isDeleted) {
        throw new Error('产品不存在');
      }

      await product.toggleFavorite(userId, isFavorite);

      return {
        isFavorited: isFavorite,
        favoriteCount: product.favoriteCount
      };
    } catch (error) {
      throw new Error(`操作收藏失败: ${error.message}`);
    }
  }

  /**
   * 获取我的收藏
   */
  async getMyFavorites(userId, options = {}) {
    try {
      const { limit = 20, skip = 0 } = options;

      const products = await ProductPublication.find({
        favoritedBy: userId,
        isDeleted: false
      })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('publisherId', 'name phone')
        .lean();

      return products.map(product => ({
        id: product._id,
        productName: product.productName,
        category: product.categoryName,
        price: this._formatPrice(product),
        coverImage: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
        publisher: {
          name: product.publisherId?.name
        },
        publishedAt: product.publishedAt,
        status: product.status,
        remainingDays: Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      throw new Error(`获取我的收藏失败: ${error.message}`);
    }
  }

  /**
   * 举报产品
   */
  async reportProduct(productId, reporterId, reporterName, reason, description) {
    try {
      const product = await ProductPublication.findById(productId);
      if (!product || product.isDeleted) {
        throw new Error('产品不存在');
      }

      await product.addReport(reporterId, reporterName, reason, description);

      // 记录审计日志
      await auditLog(reporterId, 'REPORT', 'ProductPublication', productId, {
        action: '举报产品',
        productName: product.productName,
        reason,
        description
      });

      return product;
    } catch (error) {
      throw new Error(`举报产品失败: ${error.message}`);
    }
  }

  /**
   * 获取附近的产品
   */
  async getNearbyProducts(longitude, latitude, options = {}) {
    try {
      const { maxDistance = 5000, villageId, category, limit = 20, skip = 0 } = options;

      const products = await ProductPublication.getNearbyProducts(
        longitude,
        latitude,
        maxDistance,
        { villageId, category, limit, skip }
      );

      return products.map(product => ({
        id: product._id,
        productName: product.productName,
        category: product.categoryName,
        description: product.description.substring(0, 50) + '...',
        price: this._formatPrice(product),
        coverImage: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
        publisher: {
          name: product.publisherId?.name || '村民'
        },
        distance: product.distance ? Math.round(product.distance) : null,
        remainingDays: Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      throw new Error(`获取附近产品失败: ${error.message}`);
    }
  }

  /**
   * 搜索产品
   */
  async searchProducts(villageId, searchCriteria = {}) {
    try {
      const {
        keyword,
        category,
        priceMin,
        priceMax,
        limit = 20,
        skip = 0
      } = searchCriteria;

      const products = await ProductPublication.getValidProducts(villageId, {
        keyword,
        category,
        priceMin,
        priceMax,
        limit,
        skip
      });

      return {
        total: products.length,
        data: products.map(product => ({
          id: product._id,
          productName: product.productName,
          category: product.categoryName,
          description: product.description.substring(0, 80) + (product.description.length > 80 ? '...' : ''),
          price: this._formatPrice(product),
          coverImage: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
          publisher: {
            name: product.publisherId?.name || '村民'
          },
          remainingDays: Math.ceil((product.effectiveUntil - new Date()) / (1000 * 60 * 60 * 24))
        }))
      };
    } catch (error) {
      throw new Error(`搜索产品失败: ${error.message}`);
    }
  }

  /**
   * 获取产品分类
   */
  getProductCategories() {
    return {
      vegetables: { name: '蔬菜', icon: '🥬' },
      fruits: { name: '水果', icon: '🍎' },
      grains: { name: '粮食', icon: '🌾' },
      livestock: { name: '畜禽', icon: '🐔' },
      aquatic: { name: '水产', icon: '🐟' },
      specialty: { name: '土特产', icon: '🎁' },
      daily_necessities: { name: '日用品', icon: '🧴' },
      appliances: { name: '家电', icon: '📺' },
      furniture: { name: '家具', icon: '🛋️' },
      building_materials: { name: '建材', icon: '🧱' },
      housekeeping: { name: '家政', icon: '🧹' },
      repair: { name: '维修', icon: '🔧' },
      moving: { name: '搬运', icon: '📦' },
      technical: { name: '技术', icon: '🛠️' },
      secondhand: { name: '闲置物品', icon: '♻️' },
      rental: { name: '租赁', icon: '🔑' },
      wanted: { name: '求购', icon: '🙋' }
    };
  }

  /**
   * 获取统计数据
   */
  async getStatistics(villageId) {
    try {
      const stats = await ProductPublication.getProductStats(villageId);

      const result = {
        total: 0,
        published: 0,
        pending: 0,
        rejected: 0,
        expired: 0,
        offline: 0
      };

      stats.forEach(stat => {
        result.total += stat.count;
        switch (stat._id) {
          case ProductStatus.PUBLISHED:
            result.published = stat.count;
            break;
          case ProductStatus.PENDING:
          case ProductStatus.REVIEWING:
            result.pending = stat.count;
            break;
          case ProductStatus.REJECTED:
            result.rejected = stat.count;
            break;
          case ProductStatus.EXPIRED:
            result.expired = stat.count;
            break;
          case ProductStatus.OFFLINE:
            result.offline = stat.count;
            break;
        }
      });

      return result;
    } catch (error) {
      throw new Error(`获取统计数据失败: ${error.message}`);
    }
  }

  /**
   * 获取热门分类
   */
  async getPopularCategories(villageId, limit = 10) {
    try {
      const categories = await ProductPublication.getPopularCategories(villageId, limit);
      const categoryNames = this.getProductCategories();

      return categories.map(cat => ({
        key: cat._id,
        name: categoryNames[cat._id]?.name || cat._id,
        icon: categoryNames[cat._id]?.icon || '📦',
        count: cat.count,
        totalViews: cat.totalViews
      }));
    } catch (error) {
      throw new Error(`获取热门分类失败: ${error.message}`);
    }
  }

  /**
   * 标记过期产品（定时任务）
   */
  async markExpiredProducts() {
    try {
      const count = await ProductPublication.markExpiredProducts();
      return { markedCount: count };
    } catch (error) {
      throw new Error(`标记过期产品失败: ${error.message}`);
    }
  }

  /**
   * 私有方法 - 格式化价格显示
   */
  _formatPrice(product) {
    switch (product.priceType) {
      case PriceType.NEGOTIABLE:
        return '面议';
      case PriceType.RANGE:
        return `${product.priceMin} - ${product.priceMax} ${product.priceUnit}`;
      default:
        return `${product.price} ${product.priceUnit}`;
    }
  }

  /**
   * 私有方法 - 手机号脱敏
   */
  _maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return `${phone.substring(0, 3)}****${phone.substring(7)}`;
  }

  /**
   * 私有方法 - 获取状态名称
   */
  _getStatusName(status) {
    const statusMap = {
      [ProductStatus.PENDING]: '待审核',
      [ProductStatus.REVIEWING]: '审核中',
      [ProductStatus.PUBLISHED]: '已发布',
      [ProductStatus.REJECTED]: '已拒绝',
      [ProductStatus.EXPIRED]: '已失效',
      [ProductStatus.OFFLINE]: '已下架',
      [ProductStatus.SOLD_OUT]: '已售罄'
    };
    return statusMap[status] || status;
  }
}

module.exports = new ProductPublicationService();
