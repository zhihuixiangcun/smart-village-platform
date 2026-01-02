/**
 * 朋友圈控制器
 * 处理朋友圈相关的业务逻辑
 */

const SocialPost = require('../models/SocialPost');
const Comment = require('../models/Comment');
const SocialFollow = require('../models/SocialFollow');
const SocialTopic = require('../models/SocialTopic');
const User = require('../models/User');

// ============== 动态管理 ==============

/**
 * 创建动态
 */
exports.createPost = async (req, res) => {
  try {
    const { villageId, postType, content, tags, category, location, visibility, topicId } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!postType || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 提取@提及的用户
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content.text || '')) !== null) {
      const mentionedUser = await User.findOne({ username: match[1] });
      if (mentionedUser) {
        mentions.push(mentionedUser._id);
      }
    }

    // 创建动态
    const post = new SocialPost({
      villageId,
      author: userId,
      postType,
      content,
      tags: tags || [],
      category: category || 'daily',
      mentions,
      location,
      visibility: visibility || 'public',
      topicId,
      status: 'published'
    });

    await post.save();

    // 关联话题
    if (topicId) {
      await SocialTopic.findByIdAndUpdate(topicId, { $inc: { postsCount: 1 } });
    }

    // 发送通知给被@的用户
    if (mentions.length > 0) {
      // TODO: 发送通知
    }

    return res.status(201).json({
      success: true,
      data: post,
      message: '动态发布成功'
    });
  } catch (error) {
    console.error('创建动态失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CREATE_POST_ERROR'
    });
  }
};

/**
 * 获取动态列表
 */
exports.getPosts = async (req, res) => {
  try {
    const {
      villageId,
      userId,
      category,
      tags,
      topicId,
      visibility,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = { status: 'published', 'moderation.status': 'approved' };

    // 过滤条件
    if (villageId) query.villageId = villageId;
    if (userId) query.author = userId;
    if (category) query.category = category;
    if (topicId) query.topicId = topicId;
    if (tags) query.tags = { $in: tags.split(',') };
    if (visibility) query.visibility = visibility;

    // 分页查询
    const posts = await SocialPost.find(query)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar committeeProfile.qrCode')
      .populate('topicId', 'name slug')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // 获取总数
    const total = await SocialPost.countDocuments(query);

    // 获取当前用户的点赞状态
    const postsWithUserLike = posts.map(post => ({
      ...post,
      isLiked: false, // TODO: 根据用户点赞记录判断
      isBookmarked: false
    }));

    return res.json({
      success: true,
      data: postsWithUserLike,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取动态列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_POSTS_ERROR'
    });
  }
};

/**
 * 获取动态详情
 */
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await SocialPost.findById(id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar')
      .populate('topicId', 'name slug')
      .populate('mentions', 'username profile.firstName profile.lastName');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 增加浏览量
    await post.incrementView();

    // 获取评论
    const comments = await Comment.find({ postId: id, parentComment: null, status: 'active' })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar')
      .populate('replyToUser', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      data: {
        ...post.toObject(),
        comments
      }
    });
  } catch (error) {
    console.error('获取动态详情失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_POST_ERROR'
    });
  }
};

/**
 * 更新动态
 */
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const post = await SocialPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 检查权限
    if (!post.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权修改此动态',
        code: 'NO_PERMISSION'
      });
    }

    // 更新允许修改的字段
    const allowedUpdates = ['content', 'tags', 'category', 'location', 'visibility'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        post[field] = updates[field];
      }
    });

    await post.save();

    return res.json({
      success: true,
      data: post,
      message: '动态更新成功'
    });
  } catch (error) {
    console.error('更新动态失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'UPDATE_POST_ERROR'
    });
  }
};

/**
 * 删除动态
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await SocialPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 检查权限
    if (!post.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权删除此动态',
        code: 'NO_PERMISSION'
      });
    }

    // 软删除
    post.status = 'deleted';
    await post.save();

    // 删除相关评论
    await Comment.deleteMany({ postId: id });

    return res.json({
      success: true,
      message: '动态删除成功'
    });
  } catch (error) {
    console.error('删除动态失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'DELETE_POST_ERROR'
    });
  }
};

/**
 * 点赞动态
 */
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await SocialPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // TODO: 检查是否已点赞
    // 这里需要单独的Like表或Redis来存储点赞关系
    await post.incrementInteraction('likes');

    // 更新亲密度
    await SocialFollow.updateCloseness(userId, post.author);

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
 * 取消点赞
 */
exports.unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await SocialPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    await post.decrementInteraction('likes');

    return res.json({
      success: true,
      data: { likes: post.interactions.likes },
      message: '取消点赞成功'
    });
  } catch (error) {
    console.error('取消点赞失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'UNLIKE_POST_ERROR'
    });
  }
};

/**
 * 分享动态
 */
exports.sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { villageId, comment } = req.body;
    const userId = req.user.id;

    const originalPost = await SocialPost.findById(id);
    if (!originalPost) {
      return res.status(404).json({
        success: false,
        error: '原动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 创建分享动态
    const sharedPost = new SocialPost({
      villageId: villageId || originalPost.villageId,
      author: userId,
      postType: 'share',
      content: {
        share: {
          originalPostId: id,
          comment: comment || ''
        }
      },
      category: 'daily',
      status: 'published'
    });

    await sharedPost.save();

    // 增加原动态的分享数
    await originalPost.incrementInteraction('shares');

    return res.status(201).json({
      success: true,
      data: sharedPost,
      message: '分享成功'
    });
  } catch (error) {
    console.error('分享失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'SHARE_POST_ERROR'
    });
  }
};

// ============== 评论管理 ==============

/**
 * 添加评论
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId, replyToUserId } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '评论内容不能为空',
        code: 'EMPTY_COMMENT'
      });
    }

    // 验证动态存在
    const post = await SocialPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '动态不存在',
        code: 'POST_NOT_FOUND'
      });
    }

    // 创建评论
    const comment = new Comment({
      postId: id,
      author: userId,
      content: content.trim(),
      parentComment: parentCommentId || null,
      replyToUser: replyToUserId || null
    });

    await comment.save();

    // 增加动态评论数
    await post.incrementInteraction('comments');

    // 更新亲密度
    await SocialFollow.updateCloseness(userId, post.author);

    // 发送通知
    if (replyToUserId && !replyToUserId.equals(userId)) {
      // TODO: 发送回复通知
    }

    // 返回完整评论数据
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar')
      .populate('replyToUser', 'username profile.firstName profile.lastName');

    return res.status(201).json({
      success: true,
      data: populatedComment,
      message: '评论成功'
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'ADD_COMMENT_ERROR'
    });
  }
};

/**
 * 获取评论列表
 */
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({
      postId: id,
      parentComment: null,
      status: 'active'
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar')
      .populate('replyToUser', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Comment.countDocuments({
      postId: id,
      parentComment: null,
      status: 'active'
    });

    return res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取评论失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_COMMENTS_ERROR'
    });
  }
};

/**
 * 删除评论
 */
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: '评论不存在',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // 检查权限
    if (!comment.author.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权删除此评论',
        code: 'NO_PERMISSION'
      });
    }

    comment.status = 'deleted';
    await comment.save();

    // 减少动态评论数
    const post = await SocialPost.findById(postId);
    if (post) {
      await post.decrementInteraction('comments');
    }

    return res.json({
      success: true,
      message: '评论删除成功'
    });
  } catch (error) {
    console.error('删除评论失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'DELETE_COMMENT_ERROR'
    });
  }
};

// ============== 个性化推荐 ==============

/**
 * 获取个性化推荐流
 */
exports.getPersonalizedFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // 获取用户关注的用户
    const followings = await SocialFollow.find({
      follower: userId,
      relationType: { $in: ['follow', 'friend'] }
    }).distinct('following');

    // 获取用户所在的村庄
    const user = await User.findById(userId);
    const villageId = user?.villageId;

    // 查询条件：关注用户的动态 + 本村动态
    const query = {
      status: 'published',
      'moderation.status': 'approved',
      $or: [
        { author: { $in: followings } },
        { villageId },
        { visibility: 'public' }
      ]
    };

    const posts = await SocialPost.find(query)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar')
      .populate('topicId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await SocialPost.countDocuments(query);

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
    console.error('获取推荐流失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_FEED_ERROR'
    });
  }
};

// ============== 话题管理 ==============

/**
 * 获取热门话题
 */
exports.getTrendingTopics = async (req, res) => {
  try {
    const { limit = 10, villageId } = req.query;

    const topics = await SocialTopic.getTrending(parseInt(limit), villageId);

    return res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    console.error('获取热门话题失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_TRENDING_TOPICS_ERROR'
    });
  }
};

/**
 * 创建话题
 */
exports.createTopic = async (req, res) => {
  try {
    const { name, description, category, coverImage, villageId } = req.body;

    const topic = new SocialTopic({
      name,
      description,
      category,
      coverImage,
      villageId,
      creator: req.user.id
    });

    await topic.save();

    return res.status(201).json({
      success: true,
      data: topic,
      message: '话题创建成功'
    });
  } catch (error) {
    console.error('创建话题失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CREATE_TOPIC_ERROR'
    });
  }
};

// ============== 关注管理 ==============

/**
 * 关注用户
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        error: '不能关注自己',
        code: 'CANNOT_FOLLOW_SELF'
      });
    }

    // 检查是否已关注
    const existing = await SocialFollow.isFollowing(currentUserId, userId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '已经关注过该用户',
        code: 'ALREADY_FOLLOWING'
      });
    }

    const follow = new SocialFollow({
      follower: currentUserId,
      following: userId,
      relationType: 'follow'
    });

    await follow.save();

    return res.status(201).json({
      success: true,
      data: follow,
      message: '关注成功'
    });
  } catch (error) {
    console.error('关注失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'FOLLOW_ERROR'
    });
  }
};

/**
 * 取消关注
 */
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await SocialFollow.findOneAndDelete({
      follower: currentUserId,
      following: userId
    });

    return res.json({
      success: true,
      message: '取消关注成功'
    });
  } catch (error) {
    console.error('取消关注失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'UNFOLLOW_ERROR'
    });
  }
};

/**
 * 获取关注列表
 */
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { list } = req.query;

    const following = await SocialFollow.getFollowing(userId, { list });

    return res.json({
      success: true,
      data: following
    });
  } catch (error) {
    console.error('获取关注列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_FOLLOWING_ERROR'
    });
  }
};

/**
 * 获取粉丝列表
 */
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await SocialFollow.getFollowers(userId);

    return res.json({
      success: true,
      data: followers
    });
  } catch (error) {
    console.error('获取粉丝列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_FOLLOWERS_ERROR'
    });
  }
};

/**
 * 获取好友列表
 */
exports.getFriends = async (req, res) => {
  try {
    const { userId } = req.params;

    const friends = await SocialFollow.getFriends(userId);

    return res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_FRIENDS_ERROR'
    });
  }
};
