const UtilityService = require('../models/UtilityService');

const createService = async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      userId: req.user.id,
      villageId: req.user.villageId,
    };
    const service = await UtilityService.create(serviceData);
    
    res.status(201).json({
      success: true,
      data: service,
      message: '服务发布成功',
    });
  } catch (error) {
    console.error('创建便民服务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getServices = async (req, res) => {
  try {
    const { serviceType, tags, keyword, sortBy, page = 1, limit = 20 } = req.query;
    const filters = {
      villageId: req.user.villageId,
    };
    if (serviceType) filters.serviceType = serviceType;
    if (tags) filters.tags = { $in: tags.split(',') };
    if (keyword) filters.keyword = keyword;
    if (sortBy) filters.sortBy = sortBy;
    
    const [services, total] = await Promise.all([
      UtilityService.getPublicServices(req.user.villageId, {
        ...filters,
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      }),
      UtilityService.countDocuments({
        villageId: req.user.villageId,
        status: 'active',
      }),
    ]);
    
    res.json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取便民服务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getUserServices = async (req, res) => {
  try {
    const { serviceType, status, page = 1, limit = 20 } = req.query;
    const [services, total] = await Promise.all([
      UtilityService.getUserServices(req.user.id, {
        serviceType,
        status,
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      }),
      UtilityService.countDocuments({
        userId: req.user.id,
        ...(status && { status }),
      }),
    ]);
    
    res.json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取用户服务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await UtilityService.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    service.incrementView();
    await service.save();
    
    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('获取服务详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await UtilityService.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    Object.assign(service, req.body);
    await service.save();
    
    res.json({
      success: true,
      data: service,
      message: '服务更新成功',
    });
  } catch (error) {
    console.error('更新服务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await UtilityService.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    res.json({
      success: true,
      message: '服务删除成功',
    });
  } catch (error) {
    console.error('删除服务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const addLike = async (req, res) => {
  try {
    const service = await UtilityService.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    const added = service.addLike(req.user.id, req.user.name);
    if (added) {
      await service.save();
      res.json({
        success: true,
        data: service,
        message: '点赞成功',
      });
    } else {
      res.json({
        success: true,
        message: '已点赞',
      });
    }
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const removeLike = async (req, res) => {
  try {
    const service = await UtilityService.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    const removed = service.removeLike(req.user.id);
    if (removed) {
      await service.save();
      res.json({
        success: true,
        data: service,
        message: '取消点赞成功',
      });
    } else {
      res.json({
        success: true,
        message: '未点赞',
      });
    }
  } catch (error) {
    console.error('取消点赞失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const addComment = async (req, res) => {
  try {
    const service = await UtilityService.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    const { content } = req.body;
    service.addComment(req.user.id, req.user.name, content);
    await service.save();
    
    res.json({
      success: true,
      data: service,
      message: '评论成功',
    });
  } catch (error) {
    console.error('评论失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const contactService = async (req, res) => {
  try {
    const service = await UtilityService.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: '服务不存在',
      });
    }
    
    service.incrementContact();
    await service.save();
    
    res.json({
      success: true,
      data: service,
      message: '联系方式已记录',
    });
  } catch (error) {
    console.error('联系服务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getServiceTypes = async (req, res) => {
  try {
    const types = [
      {
        value: 'express',
        label: '快递代收',
        icon: 'logistics',
        description: '快递代收点信息',
      },
      {
        value: 'lostfound',
        label: '失物招领',
        icon: 'search',
        description: '丢失物品和招领信息',
      },
      {
        value: 'secondhand',
        label: '二手市场',
        icon: 'goods-collect-o',
        description: '二手物品买卖',
      },
      {
        value: 'delivery',
        label: '送货服务',
        icon: 'send-gift-o',
        description: '送货上门服务',
      },
      {
        value: 'locksmith',
        label: '开锁服务',
        icon: 'lock',
        description: '紧急开锁服务',
      },
      {
        value: 'water',
        label: '送水服务',
        icon: 'gift-o',
        description: '桶装水配送',
      },
    ];
    
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('获取服务类型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getServiceStatistics = async (req, res) => {
  try {
    const villageId = req.user.villageId;
    const statistics = await UtilityService.getServiceStatistics(villageId);
    
    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('获取服务统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  createService,
  getServices,
  getUserServices,
  getServiceById,
  updateService,
  deleteService,
  addLike,
  removeLike,
  addComment,
  contactService,
  getServiceTypes,
  getServiceStatistics,
};
