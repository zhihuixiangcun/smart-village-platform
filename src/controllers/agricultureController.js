/**
 * 农业知识分享控制器
 * 处理农业技术教程、经验分享、知识问答等业务逻辑
 */

const AgriculturePost = require('../models/AgriculturePost');
const User = require('../models/User');

// ============== 帖子管理 ==============

/**
 * 创建农业知识帖子
 */
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      villageId,
      postType,
      category,
      cropType,
      content,
      techniques,
      season,
      region,
      tags,
      difficulty,
      estimatedCost,
      expectedYield,
      references
    } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!title || !category || !content || !content.text) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 创建帖子
    const post = new AgriculturePost({
      title,
      villageId,
      author: userId,
      postType: postType || 'article',
      category,
      cropType,
      content,
      techniques: techniques || [],
      season,
      region,
      tags: tags || [],
      difficulty: difficulty || 'beginner',
      estimatedCost,
      expectedYield,
      references,
      status: 'draft'
    });

    await post.save();

    return res.status(201).json({
      success: true,
      data: post,
      message: '农业知识帖子创建成功'
    });
  } catch (error) {
    console.error('创建农业知识帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CREATE_POST_ERROR'
    });
  }
};

/**
 * 发布帖子
 */
exports.publishPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await AgriculturePost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 检查权限
    if (!post.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权发布此帖子',
        code: 'NO_PERMISSION'
      });
    }

    await post.publish();

    return res.json({
      success: true,
      data: post,
      message: '帖子已发布'
    });
  } catch (error) {
    console.error('发布帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'PUBLISH_POST_ERROR'
    });
  }
};

/**
 * 获取帖子列表
 */
exports.getPosts = async (req, res) => {
  try {
    const {
      villageId,
      category,
      cropType,
      season,
      difficulty,
      tags,
      expertVerified,
      page = 1,
      limit = 20,
      sort = '-publishedAt'
    } = req.query;

    const query = {
      status: 'published',
      'moderation.status': 'approved'
    };

    if (villageId) query.villageId = villageId;
    if (category) query.category = category;
    if (cropType) query.cropType = cropType;
    if (season) query.season = season;
    if (difficulty) query.difficulty = difficulty;
    if (tags) query.tags = { $in: tags.split(',') };
    if (expertVerified) query['expertVerified.isVerified'] = expertVerified === 'true';

    const posts = await AgriculturePost.find(query)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar')
      .populate('expertVerified.expertId', 'username profile.firstName profile.lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await AgriculturePost.countDocuments(query);

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_POSTS_ERROR'
    });
  }
};

/**
 * 获取帖子详情
 */
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await AgriculturePost.findById(id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar villageId')
      .populate('expertVerified.expertId', 'username profile.firstName profile.lastName profile.title')
      .populate('relatedPosts', 'title category postType content.images');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 增加浏览量
    await post.incrementView();

    return res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_POST_ERROR'
    });
  }
};

/**
 * 更新帖子
 */
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const post = await AgriculturePost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 检查权限
    if (!post.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权修改此帖子',
        code: 'NO_PERMISSION'
      });
    }

    // 只有草稿可以编辑
    if (post.status !== 'draft' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: '只有草稿状态的帖子可以编辑',
        code: 'CANNOT_EDIT'
      });
    }

    // 更新允许修改的字段
    const allowedUpdates = [
      'title', 'content', 'techniques', 'season', 'region',
      'tags', 'difficulty', 'estimatedCost', 'expectedYield', 'references'
    ];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        post[field] = updates[field];
      }
    });

    await post.save();

    return res.json({
      success: true,
      data: post,
      message: '帖子更新成功'
    });
  } catch (error) {
    console.error('更新帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'UPDATE_POST_ERROR'
    });
  }
};

/**
 * 删除帖子
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await AgriculturePost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 检查权限
    if (!post.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权删除此帖子',
        code: 'NO_PERMISSION'
      });
    }

    // 软删除
    post.status = 'archived';
    await post.save();

    return res.json({
      success: true,
      message: '帖子已删除'
    });
  } catch (error) {
    console.error('删除帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'DELETE_POST_ERROR'
    });
  }
};

// ============== 互动功能 ==============

/**
 * 点赞帖子
 */
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await AgriculturePost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // TODO: 检查是否已点赞
    await post.like(userId);

    return res.json({
      success: true,
      data: { likes: post.interactions.likes },
      message: '点赞成功'
    });
  } catch (error) {
    console.error('点赞失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'LIKE_POST_ERROR'
    });
  }
};

/**
 * 标记有用
 */
exports.markUseful = async (req, res) => {
  try {
    const { id } = req.params;
    const { useful = true } = req.body;
    const userId = req.user.id;

    const post = await AgriculturePost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    await post.markUseful(useful);

    return res.json({
      success: true,
      data: {
        usefulness: post.usefulness,
        usefulnessPercentage: post.usefulnessPercentage
      },
      message: '评价成功'
    });
  } catch (error) {
    console.error('标记有用失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'MARK_USEFUL_ERROR'
    });
  }
};

// ============== 专家认证 ==============

/**
 * 专家认证帖子
 */
exports.verifyPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const expertId = req.user.id;

    // 验证专家身份
    const expert = await User.findById(expertId);
    if (!expert || !expert.profile?.isExpert) {
      return res.status(403).json({
        success: false,
        error: '只有认证专家可以进行认证',
        code: 'NOT_EXPERT'
      });
    }

    const post = await AgriculturePost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    post.expertVerified = {
      isVerified: true,
      expertId,
      verifiedAt: new Date(),
      comments
    };

    await post.save();

    return res.json({
      success: true,
      data: post,
      message: '认证成功'
    });
  } catch (error) {
    console.error('专家认证失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'VERIFY_POST_ERROR'
    });
  }
};

// ============== 发现与推荐 ==============

/**
 * 获取热门帖子
 */
exports.getPopularPosts = async (req, res) => {
  try {
    const { villageId, limit = 10 } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID',
        code: 'MISSING_VILLAGE_ID'
      });
    }

    const posts = await AgriculturePost.getPopularPosts(villageId, parseInt(limit));

    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('获取热门帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_POPULAR_POSTS_ERROR'
    });
  }
};

/**
 * 获取专家认证帖子
 */
exports.getExpertVerifiedPosts = async (req, res) => {
  try {
    const { villageId, limit = 10 } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID',
        code: 'MISSING_VILLAGE_ID'
      });
    }

    const posts = await AgriculturePost.getExpertVerifiedPosts(villageId, parseInt(limit));

    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('获取专家认证帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_EXPERT_POSTS_ERROR'
    });
  }
};

/**
 * 搜索帖子
 */
exports.searchPosts = async (req, res) => {
  try {
    const { villageId, keyword, category, cropType, page = 1, limit = 20 } = req.query;

    if (!villageId || !keyword) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID或搜索关键词',
        code: 'MISSING_PARAMETERS'
      });
    }

    const posts = await AgriculturePost.searchPosts(
      villageId,
      keyword,
      { category, cropType, page: parseInt(page), limit: parseInt(limit) }
    );

    const total = await AgriculturePost.countDocuments({
      villageId,
      status: 'published',
      'moderation.status': 'approved',
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { 'content.text': { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } }
      ]
    });

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('搜索帖子失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'SEARCH_POSTS_ERROR'
    });
  }
};

/**
 * 获取标签云
 */
exports.getTagCloud = async (req, res) => {
  try {
    const { villageId, limit = 50 } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID',
        code: 'MISSING_VILLAGE_ID'
      });
    }

    const tags = await AgriculturePost.getTagCloud(villageId, parseInt(limit));

    return res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('获取标签云失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_TAG_CLOUD_ERROR'
    });
  }
};

/**
 * 获取统计数据
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID',
        code: 'MISSING_VILLAGE_ID'
      });
    }

    const stats = await AgriculturePost.getStatistics(villageId);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_STATISTICS_ERROR'
    });
  }
};
