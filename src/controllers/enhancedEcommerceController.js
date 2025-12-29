/**
 * 增强电商控制器
 * 处理农产品销售、拼团团购、农资采购等HTTP请求
 */

const enhancedEcommerceService = require('../services/enhancedEcommerceService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 农产品销售 ====================

/**
 * 获取商品列表
 */
exports.getProducts = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      categoryId: req.query.categoryId,
      keyword: req.query.keyword,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      featured: req.query.featured === 'true',
      inStock: req.query.inStock === 'true'
    };

    const result = await enhancedEcommerceService.getProducts(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取商品详情
 */
exports.getProductDetail = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    const product = await enhancedEcommerceService.getProductDetail(productId, userId);

    return successResponse(res, product);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 拼团团购 ====================

/**
 * 创建拼团活动
 */
exports.createGroupBuy = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const groupBuy = await enhancedEcommerceService.createGroupBuy(req.body, creatorId);

    return successResponse(res, groupBuy, '拼团活动创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 加入拼团
 */
exports.joinGroupBuy = async (req, res) => {
  try {
    const { groupBuyId } = req.params;
    const participantData = {
      ...req.body,
      userId: req.user.id
    };

    const groupBuy = await enhancedEcommerceService.joinGroupBuy(groupBuyId, participantData, req.user.id);

    return successResponse(res, groupBuy, '加入拼团成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 确认参与者支付
 */
exports.confirmParticipantPayment = async (req, res) => {
  try {
    const { groupBuyId, participantId } = req.params;
    const paymentData = req.body;

    const groupBuy = await enhancedEcommerceService.confirmParticipantPayment(groupBuyId, participantId, paymentData);

    return successResponse(res, groupBuy, '支付确认成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取拼团列表
 */
exports.getGroupBuys = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      status: req.query.status,
      productId: req.query.productId,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await enhancedEcommerceService.getGroupBuys(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取拼团详情
 */
exports.getGroupBuyDetail = async (req, res) => {
  try {
    const { groupBuyId } = req.params;
    const userId = req.user?.id;

    const groupBuy = await enhancedEcommerceService.getGroupBuyDetail(groupBuyId, userId);

    return successResponse(res, groupBuy);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 农资采购 ====================

/**
 * 获取农资列表
 */
exports.getAgriculturalSupplies = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      category: req.query.category,
      keyword: req.query.keyword,
      inStock: req.query.inStock === 'true',
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await enhancedEcommerceService.getAgriculturalSupplies(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建农资商品
 */
exports.createAgriculturalSupply = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const supply = await enhancedEcommerceService.createAgriculturalSupply(req.body, supplierId);

    return successResponse(res, supply, '农资商品创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新库存
 */
exports.updateSupplyStock = async (req, res) => {
  try {
    const { supplyId } = req.params;
    const { quantityChange } = req.body;

    const supply = await enhancedEcommerceService.updateSupplyStock(supplyId, quantityChange);

    return successResponse(res, supply, '库存更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 集体采购 ====================

/**
 * 创建集体采购
 */
exports.createBulkPurchase = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const purchase = await enhancedEcommerceService.createBulkPurchase(req.body, organizerId);

    return successResponse(res, purchase, '集体采购创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 加入集体采购
 */
exports.joinBulkPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const participantData = req.body;

    const purchase = await enhancedEcommerceService.joinBulkPurchase(purchaseId, participantData, req.user.id);

    return successResponse(res, purchase, '加入集体采购成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 审核集体采购
 */
exports.approveBulkPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const approverData = {
      ...req.body,
      userId: req.user.id
    };

    const purchase = await enhancedEcommerceService.approveBulkPurchase(purchaseId, approverData);

    return successResponse(res, purchase, approverData.approved ? '已通过' : '已拒绝');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 添加供应商报价
 */
exports.addSupplierQuote = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const quoteData = req.body;

    const purchase = await enhancedEcommerceService.addSupplierQuote(purchaseId, quoteData);

    return successResponse(res, purchase, '报价添加成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 选择供应商
 */
exports.selectSupplier = async (req, res) => {
  try {
    const { purchaseId, supplierId } = req.params;

    const purchase = await enhancedEcommerceService.selectSupplier(purchaseId, supplierId, req.user.id);

    return successResponse(res, purchase, '供应商选择成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取集体采购列表
 */
exports.getBulkPurchases = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      status: req.query.status,
      type: req.query.type,
      organizerId: req.query.organizerId,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await enhancedEcommerceService.getBulkPurchases(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取集体采购详情
 */
exports.getBulkPurchaseDetail = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const userId = req.user?.id;

    const purchase = await enhancedEcommerceService.getBulkPurchaseDetail(purchaseId, userId);

    return successResponse(res, purchase);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 购物车 ====================

/**
 * 添加到购物车
 */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, specifications } = req.body;

    const cart = await enhancedEcommerceService.addToCart(userId, productId, quantity, specifications);

    return successResponse(res, cart, '添加到购物车成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新购物车商品数量
 */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await enhancedEcommerceService.updateCartItem(userId, itemId, quantity);

    return successResponse(res, cart, '购物车更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 删除购物车商品
 */
exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await enhancedEcommerceService.removeCartItem(userId, itemId);

    return successResponse(res, cart, '商品已删除');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取购物车
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await enhancedEcommerceService.getCart(userId);

    return successResponse(res, cart);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 定时任务 ====================

/**
 * 检查拼团活动状态（定时任务）
 */
exports.checkGroupBuyStatus = async (req, res) => {
  try {
    // 验证管理员权限
    if (req.user?.role !== 'admin') {
      return errorResponse(res, '需要管理员权限', 403);
    }

    const result = await enhancedEcommerceService.checkGroupBuyStatus();

    return successResponse(res, result, '活动状态检查完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
