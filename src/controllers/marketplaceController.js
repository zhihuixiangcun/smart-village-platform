/**
 * 市场控制器 - 处理商品、商家、拼车等API
 */
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');

/**
 * 获取附近商品
 */
exports.getNearbyProducts = async (req, res) => {
  try {
    const {
      longitude,
      latitude,
      radius = 5000,
      category,
      keyword,
      sort = 'distance',
      page = 1,
      limit = 20
    } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: '缺少位置信息'
      });
    }

    const coordinates = [parseFloat(longitude), parseFloat(latitude)];
    const maxDistance = parseInt(radius);

    // 构建查询条件
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates
          },
          $maxDistance: maxDistance
        }
      },
      status: 'available',
      isActive: true
    };

    // 分类筛选
    if (category && category !== 'all') {
      query.category = category;
    }

    // 关键词搜索
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
      ];
    }

    // 执行查询
    let products = await Product.find(query)
      .populate('publisherId', 'username name avatar')
      .populate('merchantId', 'name address phone')
      .lean();

    // 计算距离
    products = products.map(product => {
      const distance = calculateDistance(
        coordinates[1],
        coordinates[0],
        product.location.coordinates[1],
        product.location.coordinates[0]
      );

      return {
        ...product,
        distance
      };
    });

    // 排序
    products.sort((a, b) => {
      switch (sort) {
      case 'distance':
        return a.distance - b.distance;
      case 'rating':
        return b.rating - a.rating;
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      default:
        return 0;
      }
    });

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        total: products.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(products.length / limit)
      }
    });
  } catch (error) {
    console.error('获取附近商品失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
};

/**
 * 获取商品详情
 */
exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('publisherId', 'username name avatar phone')
      .populate('merchantId', 'name address phone rating');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: '商品不存在'
      });
    }

    // 增加浏览量
    product.addView();

    // 获取评价
    const reviews = await Review.find({
      targetType: 'product',
      targetId: id
    })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        product,
        reviews
      }
    });
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
};

/**
 * 发布商品
 */
exports.publishProduct = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const {
      name,
      description,
      category,
      price,
      unit,
      stock,
      images,
      tags,
      location,
      address
    } = req.body;

    // 验证必填字段
    if (!name || !description || !category || !price) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }

    // 创建商品
    const product = new Product({
      name,
      description,
      category,
      price,
      unit: unit || '斤',
      stock: stock || 0,
      images: images || [],
      tags: tags || [],
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      address,
      publisherId: userId,
      auditStatus: 'pending' // 需要审核
    });

    await product.save();

    res.json({
      success: true,
      data: product,
      message: '商品发布成功，等待审核'
    });
  } catch (error) {
    console.error('发布商品失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
};

/**
 * 计算两点间距离（米）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球半径（米）
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

module.exports = exports;
