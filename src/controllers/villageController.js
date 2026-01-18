const Announcement = require('../models/Announcement');
const Village = require('../models/Village');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const buildOperator = (req) => ({
  userId: req.user?.userId || req.headers['x-user-id'],
  username: req.user?.username || 'system',
  name: req.user?.name || '系统',
  role: req.user?.role || 'admin',
  villageId: req.user?.villageId,
  sessionId: req.headers['x-session-id'] || `session_${Date.now()}`
});

const createAnnouncement = async (req, res) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (errors && errors.array && !errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const operator = buildOperator(req);
    
    const announcement = new Announcement({
      title: req.body.title,
      content: req.body.content,
      type: req.body.type || 'general',
      priority: req.body.priority || 'normal',
      category: req.body.category,
      villageId: operator.villageId,
      createdBy: {
        userId: operator.userId,
        username: operator.username,
        name: operator.name
      },
      publishAt: req.body.publishAt || new Date(),
      expireAt: req.body.expireAt,
      attachments: req.body.attachments || [],
      targetAudience: req.body.targetAudience || 'all',
      status: req.body.status || 'draft'
    });

    await announcement.save();
    
    if (announcement.status === 'published') {
      cache.del('announcements:list:*');
    }

    logger.info(`公告创建成功: ${announcement._id}`, { 
      userId: operator.userId,
      title: announcement.title,
      duration: Date.now() - startTime 
    });

    res.status(201).json({
      success: true,
      data: announcement,
      message: '公告创建成功'
    });

  } catch (error) {
    logger.error('创建公告失败:', error);
    res.status(500).json({
      success: false,
      error: '创建公告失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAnnouncements = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      villageId,
      status = 'published',
      type,
      category,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'publishAt',
      sortOrder = 'desc'
    } = req.query;

    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    if (!queryVillageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const cacheKey = `announcements:list:${queryVillageId}:${status}:${page}:${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const query = { villageId: queryVillageId };
    if (status !== 'all') query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('createdBy.userId', 'name username')
        .lean(),
      Announcement.countDocuments(query)
    ]);

    const result = {
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    cache.set(cacheKey, result, 60);

    logger.info(`获取公告列表成功`, { 
      userId: operator.userId,
      count: announcements.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取公告列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取公告列表失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateAnnouncement = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const updates = req.body;

    const operator = buildOperator(req);

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    if (announcement.villageId.toString() !== operator.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        error: '没有权限修改此公告'
      });
    }

    Object.assign(announcement, updates);
    announcement.updatedBy = {
      userId: operator.userId,
      username: operator.username,
      name: operator.name,
      updatedAt: new Date()
    };

    await announcement.save();
    
    cache.del('announcements:list:*');
    cache.del(`announcement:${id}`);

    logger.info(`公告更新成功: ${id}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: announcement,
      message: '公告更新成功'
    });

  } catch (error) {
    logger.error('更新公告失败:', error);
    res.status(500).json({
      success: false,
      error: '更新公告失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteAnnouncement = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const operator = buildOperator(req);

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    if (announcement.villageId.toString() !== operator.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        error: '没有权限删除此公告'
      });
    }

    await Announcement.findByIdAndDelete(id);
    
    cache.del('announcements:list:*');
    cache.del(`announcement:${id}`);

    logger.info(`公告删除成功: ${id}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      message: '公告删除成功'
    });

  } catch (error) {
    logger.error('删除公告失败:', error);
    res.status(500).json({
      success: false,
      error: '删除公告失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getVillageStats = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId } = req.query;
    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    if (!queryVillageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const cacheKey = `village:stats:${queryVillageId}`;
    const cachedStats = cache.get(cacheKey);
    
    if (cachedStats) {
      return res.json({
        success: true,
        data: cachedStats,
        cached: true
      });
    }

    const village = await Village.findById(queryVillageId);
    if (!village) {
      return res.status(404).json({
        success: false,
        error: '村庄不存在'
      });
    }

    const announcementStats = await Announcement.aggregate([
      { $match: { villageId: queryVillageId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          byType: {
            $push: '$type'
          },
          byPriority: {
            $push: '$priority'
          }
        }
      }
    ]);

    const typeCounts = {};
    const priorityCounts = {};
    
    if (announcementStats.length > 0) {
      announcementStats[0].byType.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      announcementStats[0].byPriority.forEach(priority => {
        priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
      });
    }

    const result = {
      village: {
        id: village._id,
        name: village.name,
        population: village.population,
        households: village.households
      },
      announcements: {
        total: announcementStats[0]?.total || 0,
        published: announcementStats[0]?.published || 0,
        draft: announcementStats[0]?.draft || 0,
        byType: typeCounts,
        byPriority: priorityCounts
      },
      generatedAt: new Date()
    };

    cache.set(cacheKey, result, 300);

    logger.info(`获取村庄统计成功: ${queryVillageId}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取村庄统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取村庄统计失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAnnouncementById = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const operator = buildOperator(req);

    const cacheKey = `announcement:${id}`;
    const cachedAnnouncement = cache.get(cacheKey);
    
    if (cachedAnnouncement) {
      return res.json({
        success: true,
        data: cachedAnnouncement,
        cached: true
      });
    }

    const announcement = await Announcement.findById(id)
      .populate('createdBy.userId', 'name username')
      .populate('updatedBy.userId', 'name username')
      .lean();

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    if (announcement.villageId.toString() !== operator.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        error: '没有权限查看此公告'
      });
    }

    cache.set(cacheKey, announcement, 300);

    logger.info(`获取公告详情成功: ${id}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: announcement
    });

  } catch (error) {
    logger.error('获取公告详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取公告详情失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createAnnouncement: [
    body('title').notEmpty().withMessage('标题不能为空'),
    body('content').notEmpty().withMessage('内容不能为空'),
    createAnnouncement
  ],
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getVillageStats,
  getAnnouncementById
};
