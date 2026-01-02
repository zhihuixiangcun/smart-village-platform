/**
 * 智能推荐服务
 * 基于用户行为、内容特征、社交关系进行推荐
 */

const SocialPost = require('../models/SocialPost');
const SocialFollow = require('../models/SocialFollow');
const User = require('../models/User');

class RecommendationService {
  constructor() {
    this.weights = {
      contentSimilarity: 0.3,
      socialProximity: 0.25,
      recencyBoost: 0.2,
      popularityBoost: 0.15,
      locationRelevance: 0.1
    };
  }

  /**
   * 获取个性化推荐动态
   */
  async getPersonalizedRecommendations(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      category,
      villageId
    } = options;

    try {
      // 1. 获取用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 2. 获取用户关注的用户
      const followings = await SocialFollow.find({
        follower: userId,
        relationType: { $in: ['follow', 'friend'] }
      }).distinct('following');

      // 3. 获取用户的兴趣标签（基于历史行为）
      const userInterests = await this.getUserInterests(userId);

      // 4. 构建查询
      const query = {
        status: 'published',
        'moderation.status': 'approved',
        $or: [
          // 关注用户的动态
          { author: { $in: followings } },
          // 同村动态
          { villageId: user.villageId },
          // 公开的感兴趣话题
          {
            $and: [
              { visibility: 'public' },
              { tags: { $in: userInterests } }
            ]
          }
        ]
      };

      if (category) {
        query.category = category;
      }

      if (villageId) {
        query.$or.push({ villageId });
      }

      // 5. 获取候选动态
      const candidates = await SocialPost.find(query)
        .populate('author', 'username profile.firstName profile.lastName profile.avatar')
        .populate('topicId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limit * 3); // 获取3倍数量用于排序

      // 6. 计算推荐分数
      const scoredPosts = candidates.map(post => ({
        post,
        score: this.calculateRecommendationScore(post, user, followings, userInterests)
      }));

      // 7. 排序并返回
      scoredPosts.sort((a, b) => b.score - a.score);

      const recommendations = scoredPosts
        .slice(offset, offset + limit)
        .map(item => item.post);

      return {
        success: true,
        data: recommendations,
        meta: {
          total: candidates.length,
          returned: recommendations.length,
          algorithm: 'hybrid'
        }
      };
    } catch (error) {
      console.error('推荐失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 计算推荐分数
   */
  calculateRecommendationScore(post, user, followings, userInterests) {
    let score = 0;

    // 1. 内容相似度 (0-30分)
    score += this.getContentSimilarityScore(post, userInterests) * this.weights.contentSimilarity * 100;

    // 2. 社交距离 (0-25分)
    score += this.getSocialProximityScore(post, user, followings) * this.weights.socialProximity * 100;

    // 3. 时间新鲜度 (0-20分)
    score += this.getRecencyScore(post) * this.weights.recencyBoost * 100;

    // 4. 热度加成 (0-15分)
    score += this.getPopularityScore(post) * this.weights.popularityBoost * 100;

    // 5. 地理位置相关性 (0-10分)
    score += this.getLocationScore(post, user) * this.weights.locationRelevance * 100;

    return Math.min(score, 100);
  }

  /**
   * 内容相似度分数
   */
  getContentSimilarityScore(post, userInterests) {
    if (!post.tags || post.tags.length === 0) {
      return 0.3; // 默认分数
    }

    // 计算标签匹配度
    const matchingTags = post.tags.filter(tag => userInterests.includes(tag));
    const matchRatio = matchingTags.length / Math.max(post.tags.length, 1);

    return Math.min(matchRatio + 0.3, 1); // 基础分数0.3 + 匹配加成
  }

  /**
   * 社交距离分数
   */
  getSocialProximityScore(post, user, followings) {
    // 作者是否是关注的用户
    if (followings.some(id => id.equals(post.author._id))) {
      return 1.0;
    }

    // 检查是否有共同好友（简化处理）
    // 实际项目中应该查询共同关注数
    return 0.5;
  }

  /**
   * 时间新鲜度分数
   */
  getRecencyScore(post) {
    const now = new Date();
    const postTime = new Date(post.createdAt);
    const hoursDiff = (now - postTime) / (1000 * 60 * 60);

    // 24小时内线性衰减
    if (hoursDiff < 24) {
      return 1 - (hoursDiff / 48); // 24小时后降到0.5
    }
    // 7天内缓慢衰减
    if (hoursDiff < 168) {
      return 0.5 - ((hoursDiff - 24) / 288); // 7天后降到0
    }

    return 0.1; // 最低分数
  }

  /**
   * 热度分数
   */
  getPopularityScore(post) {
    const total = post.interactions.likes + post.interactions.comments + post.interactions.shares;
    const views = post.interactions.views || 1;

    // 互动率
    const engagementRate = total / views;

    // 使用对数缩放避免极端值
    return Math.min(Math.log10(total + 1) / 3, 1) * 0.7 +
           Math.min(engagementRate * 10, 1) * 0.3;
  }

  /**
   * 地理位置分数
   */
  getLocationScore(post, user) {
    // 同村
    if (post.villageId && post.villageId.equals(user.villageId)) {
      return 1.0;
    }

    // 邻村（可以根据坐标计算距离）
    if (post.location?.coordinates && user.location?.coordinates) {
      // 简化处理：实际应该计算距离
      return 0.6;
    }

    return 0.3;
  }

  /**
   * 获取用户兴趣标签
   */
  async getUserInterests(userId) {
    try {
      // 1. 基于用户发布的动态
      const userPosts = await SocialPost.find({ author: userId })
        .select('tags')
        .limit(50);

      const tagCounts = {};
      userPosts.forEach(post => {
        post.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // 2. 基于用户点赞的动态（需要额外的Like模型）
      // 简化处理

      // 3. 返回热门标签
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);

      return sortedTags;
    } catch (error) {
      console.error('获取用户兴趣失败:', error);
      return [];
    }
  }

  /**
   * 获取相似动态
   */
  async getSimilarPosts(postId, limit = 10) {
    try {
      const post = await SocialPost.findById(postId);
      if (!post) {
        return { success: false, error: '动态不存在' };
      }

      // 查询相同标签的动态
      const similarPosts = await SocialPost.find({
        _id: { $ne: postId },
        $or: [
          { tags: { $in: post.tags } },
          { category: post.category }
        ],
        status: 'published',
        'moderation.status': 'approved'
      })
        .populate('author', 'username profile.firstName profile.lastName profile.avatar')
        .sort({ 'interactions.likes': -1 })
        .limit(limit);

      return {
        success: true,
        data: similarPosts
      };
    } catch (error) {
      console.error('获取相似动态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取热门动态
   */
  async getTrendingPosts(options = {}) {
    const {
      limit = 20,
      villageId,
      category,
      timeRange = '24h' // 24h, 7d, 30d
    } = options;

    try {
      const query = {
        status: 'published',
        'moderation.status': 'approved'
      };

      // 时间范围
      const timeLimit = new Date();
      switch (timeRange) {
        case '24h':
          timeLimit.setHours(timeLimit.getHours() - 24);
          break;
        case '7d':
          timeLimit.setDate(timeLimit.getDate() - 7);
          break;
        case '30d':
          timeLimit.setDate(timeLimit.getDate() - 30);
          break;
      }
      query.createdAt = { $gte: timeLimit };

      if (villageId) query.villageId = villageId;
      if (category) query.category = category;

      const trendingPosts = await SocialPost.find(query)
        .populate('author', 'username profile.firstName profile.lastName profile.avatar')
        .populate('topicId', 'name slug')
        .sort({ 'interactions.likes': -1, 'interactions.views': -1 })
        .limit(limit);

      return {
        success: true,
        data: trendingPosts,
        meta: { timeRange }
      };
    } catch (error) {
      console.error('获取热门动态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新推荐权重
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * 获取推荐权重
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * 为采购商获取推荐信息（农产品、公告、村庄）
   * @param {Object} query - 推荐查询参数
   * @returns {Promise<Object>} 推荐结果
   */
  async getRecommendationsForPurchaser(query) {
    const FarmProductSupply = require('../models/FarmProductSupply');
    const Announcement = require('../models/Announcement');
    const Village = require('../models/Village');
    const logger = require('../utils/logger');

    try {
      const { categories, location, radius, purchaserType } = query;

      // 如果没有位置信息，返回全局推荐
      if (!location) {
        return this._getGlobalRecommendations(categories);
      }

      // 1. 查询附近的农产品供应
      const nearbyProducts = await this._findNearbyProducts(location, radius, categories);

      // 2. 查询附近的公告信息
      const nearbyAnnouncements = await this._findNearbyAnnouncements(location, radius, categories);

      // 3. 查询附近的村庄信息（用于商家采购商）
      const nearbyVillages = purchaserType === 'business'
        ? await this._findNearbyVillages(location, radius)
        : [];

      // 4. 综合评分和排序
      const rankedResults = this._rankResults([
        ...nearbyProducts.map(p => ({ ...p, type: 'product' })),
        ...nearbyAnnouncements.map(a => ({ ...a, type: 'announcement' }))
      ]);

      return {
        success: true,
        data: {
          recommendations: rankedResults,
          nearbyVillages,
          summary: {
            total: rankedResults.length,
            products: nearbyProducts.length,
            announcements: nearbyAnnouncements.length,
            villages: nearbyVillages.length
          }
        }
      };

    } catch (error) {
      logger.error('获取推荐失败:', error);
      throw error;
    }
  }

  /**
   * 查找附近的农产品
   * @private
   */
  async _findNearbyProducts(location, radius, categories) {
    const FarmProductSupply = require('../models/FarmProductSupply');

    try {
      const query = {
        status: 'available',
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: location
            },
            $maxDistance: radius
          }
        }
      };

      // 如果有类目筛选，添加类目条件
      if (categories && categories.length > 0) {
        query.$or = categories.map(cat => ({
          productName: { $regex: cat, $options: 'i' }
        }));
      }

      const products = await FarmProductSupply.find(query)
        .populate('supplierId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(50);

      return products.map(p => ({
        id: p._id,
        productName: p.productName,
        category: p.category,
        price: p.pricePerUnit,
        unit: p.unit,
        quantity: p.quantity,
        supplier: p.supplierId,
        location: p.location,
        distance: this._calculateDistance(location, p.location.coordinates),
        matchScore: this._calculateMatchScore(categories, p.category),
        createdAt: p.createdAt
      }));

    } catch (error) {
      console.error('查找附近产品失败:', error);
      return [];
    }
  }

  /**
   * 查找附近的公告
   * @private
   */
  async _findNearbyAnnouncements(location, radius, categories) {
    const Announcement = require('../models/Announcement');

    try {
      const query = {
        status: 'published',
        publishDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      };

      const announcements = await Announcement.find(query)
        .populate('villageId', 'name location')
        .sort({ publishDate: -1 })
        .limit(30);

      // 过滤在半径内的公告
      const filtered = announcements.filter(a => {
        if (!a.villageId?.location?.coordinates) return false;
        const distance = this._calculateDistance(location, a.villageId.location.coordinates);
        return distance <= radius / 1000;
      });

      return filtered.map(a => ({
        id: a._id,
        title: a.title,
        content: a.content,
        category: a.category,
        village: a.villageId,
        distance: this._calculateDistance(location, a.villageId.location.coordinates),
        matchScore: this._calculateMatchScore(categories, a.category),
        publishDate: a.publishDate
      }));

    } catch (error) {
      console.error('查找附近公告失败:', error);
      return [];
    }
  }

  /**
   * 查找附近的村庄
   * @private
   */
  async _findNearbyVillages(location, radius) {
    const Village = require('../models/Village');

    try {
      const villages = await Village.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: location
            },
            $maxDistance: radius
          }
        }
      })
        .select('name location population contactInfo')
        .limit(20);

      return villages.map(v => ({
        id: v._id,
        name: v.name,
        population: v.population,
        contactPhone: v.contactInfo?.phone,
        distance: this._calculateDistance(location, v.location.coordinates)
      }));

    } catch (error) {
      console.error('查找附近村庄失败:', error);
      return [];
    }
  }

  /**
   * 获取全局推荐（无位置信息时）
   * @private
   */
  async _getGlobalRecommendations(categories) {
    const FarmProductSupply = require('../models/FarmProductSupply');

    try {
      const query = { status: 'available' };

      if (categories && categories.length > 0) {
        query.$or = categories.map(cat => ({
          category: { $regex: cat, $options: 'i' }
        }));
      }

      const products = await FarmProductSupply.find(query)
        .populate('supplierId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(20);

      return {
        success: true,
        data: {
          recommendations: products.map(p => ({
            ...p.toObject(),
            type: 'product'
          })),
          nearbyVillages: [],
          summary: {
            total: products.length,
            products: products.length,
            announcements: 0,
            villages: 0
          }
        }
      };

    } catch (error) {
      console.error('获取全局推荐失败:', error);
      throw error;
    }
  }

  /**
   * 计算两点之间的距离（公里）
   * @private
   */
  _calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
      return Infinity;
    }

    const R = 6371;
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 计算匹配分数
   * @private
   */
  _calculateMatchScore(purchaserCategories, itemCategory) {
    if (!purchaserCategories || purchaserCategories.length === 0) {
      return 0.5;
    }

    if (!itemCategory) {
      return 0.3;
    }

    for (const cat of purchaserCategories) {
      if (itemCategory.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(itemCategory.toLowerCase())) {
        return 1.0;
      }
    }

    return 0.5;
  }

  /**
   * 综合评分排序
   * @private
   */
  _rankResults(results) {
    return results.sort((a, b) => {
      const scoreA = (a.matchScore || 0) * 0.5 +
                     (1 / (a.distance + 1)) * 0.3 +
                     (a.createdAt ? Math.max(0, 1 - (Date.now() - a.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)) * 0.2 : 0);

      const scoreB = (b.matchScore || 0) * 0.5 +
                     (1 / (b.distance + 1)) * 0.3 +
                     (b.createdAt ? Math.max(0, 1 - (Date.now() - b.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)) * 0.2 : 0);

      return scoreB - scoreA;
    }).slice(0, 50);
  }
}

// 创建单例
const recommendationService = new RecommendationService();

module.exports = recommendationService;
