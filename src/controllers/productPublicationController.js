/**
 * 产品发布控制器
 */

const productPublicationService = require('../services/productPublicationService');
const { validationResult } = require('express-validator');

/**
 * 创建产品发布
 */
exports.createPublication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const publication = await productPublicationService.createPublication(
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: '产品发布成功，等待审核',
      data: publication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取产品列表
 */
exports.getProductList = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      category: req.query.category,
      priceMin: req.query.priceMin,
      priceMax: req.query.priceMax,
      keyword: req.query.keyword,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      sortBy: req.query.sortBy || 'publishedAt',
      sortOrder: parseInt(req.query.sortOrder) || -1
    };

    const products = await productPublicationService.getProductList(villageId, options);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取待审核产品列表
 */
exports.getPendingList = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const pending = await productPublicationService.getPendingList(villageId, options);

    res.json({
      success: true,
      data: pending
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 审核产品
 */
exports.reviewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, remark } = req.body;

    const product = await productPublicationService.reviewProduct(
      id,
      req.user._id,
      req.user.name,
      approved,
      remark
    );

    res.json({
      success: true,
      message: approved ? '审核通过' : '已拒绝',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 下架产品
 */
exports.offlineProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const product = await productPublicationService.offlineProduct(
      id,
      req.user._id,
      req.user.name,
      reason
    );

    res.json({
      success: true,
      message: '产品已下架',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 刷新产品
 */
exports.refreshProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productPublicationService.refreshProduct(id);

    res.json({
      success: true,
      message: '产品已刷新',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 删除产品
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await productPublicationService.deleteProduct(id, req.user._id);

    res.json({
      success: true,
      message: '产品已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取产品详情
 */
exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productPublicationService.getProductDetail(id, req.user?._id);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取我发布的产品
 */
exports.getMyProducts = async (req, res) => {
  try {
    const userId = req.user._id;
    const options = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const products = await productPublicationService.getMyProducts(userId, options);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 收藏/取消收藏产品
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const { favorite } = req.body;

    const result = await productPublicationService.toggleFavorite(
      id,
      req.user._id,
      favorite !== undefined ? favorite : true
    );

    res.json({
      success: true,
      message: favorite ? '已收藏' : '已取消收藏',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取我的收藏
 */
exports.getMyFavorites = async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const products = await productPublicationService.getMyFavorites(req.user._id, options);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 举报产品
 */
exports.reportProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: '请选择举报原因'
      });
    }

    const product = await productPublicationService.reportProduct(
      id,
      req.user._id,
      req.user.name,
      reason,
      description
    );

    res.json({
      success: true,
      message: '举报已提交',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取附近的产品
 */
exports.getNearbyProducts = async (req, res) => {
  try {
    const { longitude, latitude } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '请提供经纬度坐标'
      });
    }

    const options = {
      maxDistance: parseInt(req.query.maxDistance) || 5000,
      villageId: req.query.villageId,
      category: req.query.category,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const products = await productPublicationService.getNearbyProducts(
      parseFloat(longitude),
      parseFloat(latitude),
      options
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 搜索产品
 */
exports.searchProducts = async (req, res) => {
  try {
    const { villageId } = req.params;
    const searchCriteria = {
      keyword: req.query.keyword,
      category: req.query.category,
      priceMin: req.query.priceMin,
      priceMax: req.query.priceMax,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await productPublicationService.searchProducts(villageId, searchCriteria);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取产品分类
 */
exports.getCategories = (req, res) => {
  try {
    const categories = productPublicationService.getProductCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取统计数据
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;

    const stats = await productPublicationService.getStatistics(villageId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取热门分类
 */
exports.getPopularCategories = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { limit } = req.query;

    const categories = await productPublicationService.getPopularCategories(
      villageId,
      parseInt(limit) || 10
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 上传产品图片
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const fileData = {
      url: `/uploads/products/${req.file.filename}`,
      thumbnail: `/uploads/products/thumbs/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size
    };

    res.json({
      success: true,
      message: '图片上传成功',
      data: fileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 批量上传产品图片
 */
exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const files = req.files.map(file => ({
      url: `/uploads/products/${file.filename}`,
      thumbnail: `/uploads/products/thumbs/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size
    }));

    res.json({
      success: true,
      message: `成功上传${files.length}张图片`,
      data: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取村庄产品概览
 */
exports.getVillageOverview = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { ProductPublication } = require('../models/ProductPublication');

    // 统计数据
    const stats = await ProductPublication.aggregate([
      {
        $match: {
          villageId: require('mongoose').Types.ObjectId(villageId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await ProductPublication.countDocuments({
      villageId: require('mongoose').Types.ObjectId(villageId),
      createdAt: { $gte: today },
      isDeleted: false
    });

    // 待审核数量
    const pendingCount = await ProductPublication.countDocuments({
      villageId: require('mongoose').Types.ObjectId(villageId),
      status: { $in: ['pending', 'reviewing'] },
      isDeleted: false
    });

    // 即将到期的产品
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const expiringSoon = await ProductPublication.countDocuments({
      villageId: require('mongoose').Types.ObjectId(villageId),
      status: 'published',
      effectiveUntil: { $lte: threeDaysLater },
      isDeleted: false
    });

    // 热门分类
    const popularCategories = await productPublicationService.getPopularCategories(villageId, 5);

    res.json({
      success: true,
      data: {
        stats: {
          total: stats.reduce((sum, s) => sum + s.count, 0),
          published: stats.find(s => s._id === 'published')?.count || 0,
          pending: stats.find(s => s._id === 'pending')?.count || 0,
          expired: stats.find(s => s._id === 'expired')?.count || 0
        },
        todayNew: todayCount,
        pendingReview: pendingCount,
        expiringSoon,
        popularCategories: popularCategories.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 批量审核
 */
exports.batchReview = async (req, res) => {
  try {
    const { ids, approved, remark } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要审核的产品'
      });
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const product = await productPublicationService.reviewProduct(
          id,
          req.user._id,
          req.user.name,
          approved !== undefined ? approved : true,
          remark
        );
        results.push({ id, success: true });
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `批量审核完成，成功${results.length}条，失败${errors.length}条`,
      data: {
        success: results,
        failed: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
