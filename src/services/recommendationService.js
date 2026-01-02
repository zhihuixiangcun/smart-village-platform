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
}

// 创建单例
const recommendationService = new RecommendationService();

module.exports = recommendationService;
