/**
 * 增强电商服务层
 * 处理农产品销售、拼团团购、农资采购等功能
 */

const { Product, GroupBuy, AgriculturalSupply, BulkPurchase, Shop, Cart } = require('../models/Product');
const { Village } = require('../models/Village');
const webSocketService = require('./webSocketService');

// ==================== 农产品销售 ====================

/**
 * 获取商品列表
 */
exports.getProducts = async (villageId, options = {}) => {
  const {
    categoryId,
    keyword,
    minPrice,
    maxPrice,
    sort = '-createdAt',
    limit = 20,
    skip = 0,
    featured = false,
    inStock = false
  } = options;

  const query = {
    villageId,
    status: 'active'
  };

  if (categoryId) query.categoryId = categoryId;
  if (keyword) query.$text = { $search: keyword };
  if (minPrice !== undefined) query.price = { ...query.price, $gte: minPrice };
  if (maxPrice !== undefined) query.price = { ...query.price, $lte: maxPrice };
  if (featured) query.featured = true;
  if (inStock) query.stock = { $gt: 0 };

  const products = await Product.find(query)
    .populate('categoryId', 'name code')
    .populate('shopId', 'name logo type')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    products,
    total: await Product.countDocuments(query)
  };
};

/**
 * 获取商品详情
 */
exports.getProductDetail = async (productId, userId) => {
  const product = await Product.findById(productId)
    .populate('categoryId', 'name code')
    .populate('shopId', 'name logo type ownerId contact')
    .populate('sellerId', 'name avatar phone')
    .lean();

  if (!product) {
    throw new Error('商品不存在');
  }

  // 增加浏览量
  await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

  // 获取相关商品
  product.related = await Product.find({
    categoryId: product.categoryId,
    _id: { $ne: productId },
    status: 'active'
  })
    .limit(4)
    .select('name images price sales unit')
    .lean();

  return product;
};

// ==================== 拼团团购 ====================

/**
 * 创建拼团活动
 */
exports.createGroupBuy = async (groupBuyData, creatorId) => {
  const {
    productId,
    villageId,
    tiers,
    targetQuantity,
    startTime,
    endTime
  } = groupBuyData;

  // 验证产品
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('商品不存在');
  }

  // 验证阶梯定价
  if (!tiers || tiers.length === 0) {
    throw new Error('请设置阶梯价格');
  }

  const groupBuy = new GroupBuy({
    ...groupBuyData,
    productId,
    productName: product.name,
    productImage: product.images[0]?.url,
    villageId,
    creatorId,
    leaderId: creatorId,
    status: startTime && new Date(startTime) <= new Date() ? 'active' : 'upcoming',
    currentPrice: tiers[0].price,
    originalPrice: product.price
  });

  await groupBuy.save();

  // 通知村民有新拼团
  if (webSocketService && groupBuy.status === 'active') {
    webSocketService.notifyVillage(villageId, {
      type: 'new_group_buy',
      data: {
        groupBuyId: groupBuy._id,
        productName: groupBuy.productName,
        targetQuantity: groupBuy.targetQuantity,
        endTime: groupBuy.endTime
      }
    });
  }

  return groupBuy.populate('productId');
};

/**
 * 加入拼团
 */
exports.joinGroupBuy = async (groupBuyId, participantData, userId) => {
  const { User } = require('../models/User');
  const groupBuy = await GroupBuy.findById(groupBuyId);

  if (!groupBuy) {
    throw new Error('拼团活动不存在');
  }

  if (groupBuy.status !== 'active') {
    throw new Error('拼团活动未开始或已结束');
  }

  const now = new Date();
  if (now < groupBuy.startTime || now > groupBuy.endTime) {
    throw new Error('不在拼团时间范围内');
  }

  // 获取用户信息
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 检查是否已参与
  const existingParticipant = groupBuy.participants.find(
    p => p.userId?.toString() === userId.toString()
  );
  if (existingParticipant) {
    throw new Error('您已参与此拼团');
  }

  const { quantity } = participantData;

  // 检查数量限制
  if (quantity < groupBuy.minOrderPerUser) {
    throw new Error(`最少购买${groupBuy.minOrderPerUser}件`);
  }
  if (quantity > groupBuy.maxOrderPerUser) {
    throw new Error(`最多购买${groupBuy.maxOrderPerUser}件`);
  }

  // 检查总数量
  if (groupBuy.currentQuantity + quantity > groupBuy.maxQuantity) {
    throw new Error('超出拼团总数量限制');
  }

  // 计算当前价格
  let currentPrice = groupBuy.currentPrice;
  const newQuantity = groupBuy.currentQuantity + quantity;
  const tier = groupBuy.tiers.slice().reverse().find(t =>
    newQuantity >= t.minQuantity
  );
  if (tier) {
    currentPrice = tier.price;
  }

  // 添加参与者
  groupBuy.participants.push({
    userId,
    userName: user.name,
    userPhone: user.phone,
    quantity,
    price: currentPrice,
    savedAmount: (groupBuy.originalPrice - currentPrice) * quantity,
    status: 'pending'
  });

  groupBuy.currentQuantity = newQuantity;
  groupBuy.currentPrice = currentPrice;

  await groupBuy.save();

  // 检查是否达到目标
  if (groupBuy.autoSuccess && groupBuy.currentQuantity >= groupBuy.targetQuantity) {
    groupBuy.status = 'success';
    groupBuy.successTime = new Date();
    await groupBuy.save();

    // 通知所有参与者拼团成功
    groupBuy.participants.forEach(participant => {
      if (participant.userId && webSocketService) {
        webSocketService.broadcastToUser(participant.userId.toString(), {
          type: 'group_buy_success',
          data: {
            groupBuyId: groupBuy._id,
            productName: groupBuy.productName,
            quantity: participant.quantity
          }
        });
      }
    });
  }

  return groupBuy.populate('productId');
};

/**
 * 确认参与者支付
 */
exports.confirmParticipantPayment = async (groupBuyId, participantId, paymentData) => {
  const groupBuy = await GroupBuy.findById(groupBuyId);

  if (!groupBuy) {
    throw new Error('拼团活动不存在');
  }

  const participant = groupBuy.participants.id(participantId);
  if (!participant) {
    throw new Error('参与者不存在');
  }

  participant.status = 'paid';
  participant.paymentId = paymentData.paymentId;
  participant.paidAt = new Date();

  await groupBuy.save();

  return groupBuy;
};

/**
 * 获取拼团列表
 */
exports.getGroupBuys = async (villageId, options = {}) => {
  const {
    status,
    productId,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (status) query.status = status;
  if (productId) query.productId = productId;

  const groupBuys = await GroupBuy.find(query)
    .populate('productId', 'name images price')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    groupBuys,
    total: await GroupBuy.countDocuments(query)
  };
};

/**
 * 获取拼团详情
 */
exports.getGroupBuyDetail = async (groupBuyId, userId) => {
  const groupBuy = await GroupBuy.findById(groupBuyId)
    .populate('productId', 'name images description price specifications')
    .populate('leaderId', 'name avatar')
    .lean();

  if (!groupBuy) {
    throw new Error('拼团活动不存在');
  }

  // 检查用户是否已参与
  if (userId) {
    const userIdStr = userId.toString();
    groupBuy.userParticipation = groupBuy.participants.find(
      p => p.userId?.toString() === userIdStr
    );
  }

  // 计算进度
  groupBuy.progress = (groupBuy.currentQuantity / groupBuy.targetQuantity * 100).toFixed(2);

  return groupBuy;
};

// ==================== 农资采购 ====================

/**
 * 获取农资列表
 */
exports.getAgriculturalSupplies = async (villageId, options = {}) => {
  const {
    category,
    keyword,
    inStock = false,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = {
    villageId,
    status: 'active'
  };

  if (category) query.category = category;
  if (keyword) query.$text = { $search: keyword };
  if (inStock) query.stock = { $gt: 0 };

  const supplies = await AgriculturalSupply.find(query)
    .populate('supplierId', 'name logo type')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    supplies,
    total: await AgriculturalSupply.countDocuments(query)
  };
};

/**
 * 创建农资商品
 */
exports.createAgriculturalSupply = async (supplyData, supplierId) => {
  const { villageId, supplierId: shopId, category } = supplyData;

  // 验证供应商
  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new Error('供应商不存在');
  }

  const supply = new AgriculturalSupply({
    ...supplyData,
    supplierName: shop.name,
    supplierContact: shop.contact
  });

  await supply.save();

  return supply.populate('supplierId');
};

/**
 * 更新库存
 */
exports.updateSupplyStock = async (supplyId, quantityChange) => {
  const supply = await AgriculturalSupply.findById(supplyId);

  if (!supply) {
    throw new Error('农资商品不存在');
  }

  supply.stock += quantityChange;

  // 检查库存预警
  if (supply.stock <= supply.minStock) {
    // 通知供应商库存不足
    if (webSocketService) {
      webSocketService.broadcastToUser(supply.supplierId.toString(), {
        type: 'low_stock_alert',
        data: {
          supplyId: supply._id,
          name: supply.name,
          currentStock: supply.stock,
          minStock: supply.minStock
        }
      });
    }
  }

  if (supply.stock < 0) {
    supply.stock = 0;
    supply.status = 'out_of_stock';
  }

  await supply.save();

  return supply;
};

// ==================== 集体采购 ====================

/**
 * 创建集体采购
 */
exports.createBulkPurchase = async (purchaseData, organizerId) => {
  const { User } = require('../models/User');
  const {
    villageId,
    type,
    targetQuantity,
    items,
    estimatedBudget,
    organizerName,
    organizerRole
  } = purchaseData;

  // 验证村庄
  const village = await Village.findById(villageId);
  if (!village) {
    throw new Error('村庄不存在');
  }

  // 获取组织者信息
  const organizer = await User.findById(organizerId);
  if (!organizer) {
    throw new Error('组织者不存在');
  }

  const purchase = new BulkPurchase({
    ...purchaseData,
    organizerId,
    organizerName: organizerName || organizer.name,
    status: 'draft'
  });

  await purchase.save();

  // 通知村干部审核
  if (purchase.approval.required && webSocketService) {
    webSocketService.notifyVillage(villageId, {
      type: 'bulk_purchase_pending_approval',
      data: {
        purchaseId: purchase._id,
        title: purchase.title,
        organizerName: purchase.organizerName
      }
    });
  }

  return purchase;
};

/**
 * 加入集体采购
 */
exports.joinBulkPurchase = async (purchaseId, participantData, userId) => {
  const { User } = require('../models/User');
  const purchase = await BulkPurchase.findById(purchaseId);

  if (!purchase) {
    throw new Error('集体采购不存在');
  }

  if (purchase.status !== 'registering') {
    throw new Error('当前不在报名阶段');
  }

  const now = new Date();
  if (now < purchase.registrationStart || now > purchase.registrationEnd) {
    throw new Error('不在报名时间范围内');
  }

  // 获取用户信息
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 检查是否已参与
  const existingParticipant = purchase.participants.find(
    p => p.userId?.toString() === userId.toString()
  );
  if (existingParticipant) {
    throw new Error('您已参与此采购');
  }

  const { farmArea, requiredQuantity, contributedAmount } = participantData;

  purchase.participants.push({
    userId,
    userName: user.name,
    farmArea,
    requiredQuantity,
    contributedAmount,
    paymentStatus: contributedAmount > 0 ? 'partial' : 'pending'
  });

  purchase.currentQuantity += requiredQuantity;
  purchase.currentCollected += contributedAmount || 0;

  await purchase.save();

  // 通知组织者
  if (webSocketService) {
    webSocketService.broadcastToUser(purchase.organizerId.toString(), {
      type: 'bulk_purchase_new_participant',
      data: {
        purchaseId: purchase._id,
        participantName: user.name
      }
    });
  }

  return purchase;
};

/**
 * 审核集体采购
 */
exports.approveBulkPurchase = async (purchaseId, approverData) => {
  const { User } = require('../models/User');
  const { userId, userName, role, approved, comment } = approverData;

  const purchase = await BulkPurchase.findById(purchaseId);

  if (!purchase) {
    throw new Error('集体采购不存在');
  }

  if (!purchase.approval.required) {
    throw new Error('此采购无需审批');
  }

  // 获取审核人信息
  const approver = await User.findById(userId);
  if (!approver) {
    throw new Error('审核人不存在');
  }

  // 检查是否已审核过
  const existingApprover = purchase.approval.approvers.find(
    a => a.userId?.toString() === userId.toString()
  );
  if (existingApprover) {
    throw new Error('您已审核过此采购');
  }

  purchase.approval.approvers.push({
    userId,
    userName: userName || approver.name,
    role,
    status: approved ? 'approved' : 'rejected',
    comment,
    decidedAt: new Date()
  });

  // 检查是否所有审批人都已通过
  const allApproved = purchase.approval.approvers.every(
    a => a.status === 'approved'
  );

  if (allApproved) {
    purchase.approval.status = 'approved';
    purchase.status = 'registering';

    // 通知村民可以报名
    if (webSocketService) {
      webSocketService.notifyVillage(purchase.villageId.toString(), {
        type: 'bulk_purchase_approved',
        data: {
          purchaseId: purchase._id,
          title: purchase.title
        }
      });
    }
  } else if (!approved) {
    purchase.approval.status = 'rejected';
    purchase.status = 'cancelled';
  }

  await purchase.save();

  return purchase;
};

/**
 * 添加供应商报价
 */
exports.addSupplierQuote = async (purchaseId, quoteData) => {
  const purchase = await BulkPurchase.findById(purchaseId);

  if (!purchase) {
    throw new Error('集体采购不存在');
  }

  const { supplierId, supplierName, quotedPrice, deliveryTime, paymentTerms } = quoteData;

  // 检查供应商是否已报价
  const existingSupplier = purchase.suppliers.find(
    s => s.supplierId?.toString() === supplierId.toString()
  );
  if (existingSupplier) {
    throw new Error('供应商已报价');
  }

  purchase.suppliers.push({
    supplierId,
    supplierName,
    quotedPrice,
    deliveryTime,
    paymentTerms,
    status: 'pending'
  });

  await purchase.save();

  return purchase;
};

/**
 * 选择供应商
 */
exports.selectSupplier = async (purchaseId, supplierId, userId) => {
  const purchase = await BulkPurchase.findById(purchaseId);

  if (!purchase) {
    throw new Error('集体采购不存在');
  }

  if (purchase.organizerId.toString() !== userId.toString()) {
    throw new Error('只有组织者可以选择供应商');
  }

  const supplier = purchase.suppliers.id(supplierId);
  if (!supplier) {
    throw new Error('供应商不存在');
  }

  // 更新所有供应商状态
  purchase.suppliers.forEach(s => {
    s.status = s._id.toString() === supplierId ? 'selected' : 'rejected';
  });

  purchase.selectedSupplierId = supplierId;
  purchase.status = 'purchasing';

  await purchase.save();

  return purchase;
};

/**
 * 获取集体采购列表
 */
exports.getBulkPurchases = async (villageId, options = {}) => {
  const {
    status,
    type,
    organizerId,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (status) query.status = status;
  if (type) query.type = type;
  if (organizerId) query.organizerId = organizerId;

  const purchases = await BulkPurchase.find(query)
    .populate('organizerId', 'name avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    purchases,
    total: await BulkPurchase.countDocuments(query)
  };
};

/**
 * 获取集体采购详情
 */
exports.getBulkPurchaseDetail = async (purchaseId, userId) => {
  const purchase = await BulkPurchase.findById(purchaseId)
    .populate('organizerId', 'name avatar phone')
    .populate('items.supplyId', 'name images specifications')
    .populate('suppliers.supplierId', 'name logo contact')
    .lean();

  if (!purchase) {
    throw new Error('集体采购不存在');
  }

  // 检查用户参与状态
  if (userId) {
    const userIdStr = userId.toString();
    purchase.userParticipation = purchase.participants.find(
      p => p.userId?.toString() === userIdStr
    );
  }

  return purchase;
};

// ==================== 购物车 ====================

/**
 * 添加到购物车
 */
exports.addToCart = async (userId, productId, quantity, specifications) => {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  // 检查是否已存在
  const existingItem = cart.items.find(
    item => item.productId.toString() === productId.toString() &&
           JSON.stringify(item.specifications) === JSON.stringify(specifications)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('商品不存在');
    }

    cart.items.push({
      productId,
      quantity,
      specifications,
      price: product.price
    });
  }

  await cart.save();

  return cart;
};

/**
 * 更新购物车商品数量
 */
exports.updateCartItem = async (userId, itemId, quantity) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error('购物车不存在');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new Error('商品不存在');
  }

  if (quantity <= 0) {
    item.remove();
  } else {
    item.quantity = quantity;
  }

  await cart.save();

  return cart;
};

/**
 * 删除购物车商品
 */
exports.removeCartItem = async (userId, itemId) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error('购物车不存在');
  }

  cart.items.id(itemId).remove();
  await cart.save();

  return cart;
};

/**
 * 获取购物车
 */
exports.getCart = async (userId) => {
  const cart = await Cart.findOne({ userId })
    .populate('items.productId', 'name images price stock unit');

  return cart;
};

// ==================== 定时任务 ====================

/**
 * 检查拼团活动状态（定时任务）
 */
exports.checkGroupBuyStatus = async () => {
  const now = new Date();

  // 检查应该开始的活动
  const startingBuys = await GroupBuy.find({
    status: 'upcoming',
    startTime: { $lte: now },
    autoActivate: true
  });

  const results = [];

  for (const buy of startingBuys) {
    buy.status = 'active';
    await buy.save();
    results.push({ action: 'activated', groupBuyId: buy._id });
  }

  // 检查应该结束的活动
  const endingBuys = await GroupBuy.find({
    status: 'active',
    endTime: { $lte: now },
    autoFail: true
  });

  for (const buy of endingBuys) {
    if (buy.currentQuantity >= buy.targetQuantity) {
      buy.status = 'success';
      buy.successTime = now;
    } else {
      buy.status = 'failed';
      buy.failedReason = '拼团人数不足';

      // 自动退款
      if (buy.refundConfig.autoRefund) {
        buy.status = 'refunding';
      }
    }
    await buy.save();
    results.push({ action: 'ended', groupBuyId: buy._id, status: buy.status });
  }

  return {
    checked: startingBuys.length + endingBuys.length,
    updated: results.length,
    results
  };
};
