/**
 * 乡村生活服务圈控制器
 * P2功能模块 - 乡村生活服务圈
 */

const HelpRequest = require('../models/HelpRequest');
const CarpoolRequest = require('../models/CarpoolRequest');
const SharedEquipment = require('../models/SharedEquipment');
const VillageActivity = require('../models/VillageActivity');
const ServicePoint = require('../models/ServicePoint');
const AgriculturalProduct = require('../models/AgriculturalProduct');
const { emitToVillage } = require('../services/socketService');

/**
 * ========== 邻里互助模块 ==========
 */

/**
 * 获取求助请求列表
 */
exports.getHelpRequests = async (req, res) => {
  try {
    const { status, category, villageId } = req.query;
    const filter = { villageId: villageId || req.user.villageId };

    if (status) filter.status = status;
    if (category) filter.category = category;

    const requests = await HelpRequest.find(filter)
      .populate('requester', 'name avatar phone')
      .populate('respondents.userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('获取求助请求失败:', error);
    res.status(500).json({
      success: false,
      message: '获取求助请求失败'
    });
  }
};

/**
 * 创建求助请求
 */
exports.createHelpRequest = async (req, res) => {
  try {
    const { title, category, description, points, urgentUntil } = req.body;

    const request = await HelpRequest.create({
      villageId: req.user.villageId,
      requester: req.user._id,
      title,
      category,
      description,
      points: points || 10,
      urgentUntil,
      status: 'pending'
    });

    // 通知全村村民
    emitToVillage(req.user.villageId, 'help-request-created', {
      requestId: request._id,
      title: request.title,
      category: request.category,
      points: request.points,
      requester: req.user.name
    });

    res.status(201).json({
      success: true,
      data: request,
      message: '求助发布成功'
    });
  } catch (error) {
    console.error('创建求助请求失败:', error);
    res.status(500).json({
      success: false,
      message: '创建求助请求失败'
    });
  }
};

/**
 * 响应求助请求（抢单）
 */
exports.respondToHelpRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const request = await HelpRequest.findById(id);

    if (!request || request.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '求助请求不存在'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该请求已被接单或已关闭'
      });
    }

    // 检查是否已响应
    const alreadyResponded = request.respondents.some(
      r => r.userId.toString() === req.user._id.toString()
    );

    if (alreadyResponded) {
      return res.status(400).json({
        success: false,
        message: '您已响应过该请求'
      });
    }

    request.respondents.push({
      userId: req.user._id,
      message,
      respondedAt: new Date()
    });

    await request.save();

    // 通知求助者
    emitToVillage(req.user.villageId, 'help-request-responded', {
      requestId: request._id,
      responder: req.user.name,
      message
    });

    res.json({
      success: true,
      data: request,
      message: '响应成功'
    });
  } catch (error) {
    console.error('响应求助失败:', error);
    res.status(500).json({
      success: false,
      message: '响应求助失败'
    });
  }
};

/**
 * 更新求助状态
 */
exports.updateHelpRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, selectedRespondent } = req.body;

    const request = await HelpRequest.findById(id);

    if (!request || request.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '求助请求不存在'
      });
    }

    // 只有求助者可以更新状态
    if (request.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权操作此请求'
      });
    }

    request.status = status;

    if (status === 'completed' && selectedRespondent) {
      request.selectedRespondent = selectedRespondent;

      // 为完成者添加积分
      const PointsRecord = require('../models/PointsRecord');
      await PointsRecord.create({
        userId: selectedRespondent,
        villageId: req.user.villageId,
        type: 'help',
        points: request.points,
        description: `完成互助：${request.title}`,
        relatedId: request._id
      });
    }

    await request.save();

    res.json({
      success: true,
      data: request,
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('更新状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新状态失败'
    });
  }
};

/**
 * ========== 拼车服务模块 ==========
 */

/**
 * 获取拼车请求
 */
exports.getCarpoolRequests = async (req, res) => {
  try {
    const { status, origin, destination } = req.query;
    const filter = { villageId: req.user.villageId };

    if (status) filter.status = status;
    if (origin) filter.origin = { $regex: origin, $options: 'i' };
    if (destination) filter.destination = { $regex: destination, $options: 'i' };

    const requests = await CarpoolRequest.find(filter)
      .populate('creator', 'name avatar phone')
      .populate('passengers.userId', 'name avatar phone')
      .sort({ departureTime: 1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('获取拼车请求失败:', error);
    res.status(500).json({
      success: false,
      message: '获取拼车请求失败'
    });
  }
};

/**
 * 创建拼车请求
 */
exports.createCarpoolRequest = async (req, res) => {
  try {
    const { origin, destination, departureTime, seats, cost, notes } = req.body;

    const request = await CarpoolRequest.create({
      villageId: req.user.villageId,
      creator: req.user._id,
      origin,
      destination,
      departureTime: new Date(departureTime),
      seats,
      cost,
      notes,
      status: 'open'
    });

    emitToVillage(req.user.villageId, 'carpool-created', {
      requestId: request._id,
      origin: request.origin,
      destination: request.destination,
      seats: request.seats,
      creator: req.user.name
    });

    res.status(201).json({
      success: true,
      data: request,
      message: '拼车发布成功'
    });
  } catch (error) {
    console.error('创建拼车请求失败:', error);
    res.status(500).json({
      success: false,
      message: '创建拼车请求失败'
    });
  }
};

/**
 * 加入拼车
 */
exports.joinCarpool = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickupLocation } = req.body;

    const request = await CarpoolRequest.findById(id);

    if (!request || request.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '拼车请求不存在'
      });
    }

    if (request.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: '该拼车已满员或已关闭'
      });
    }

    if (request.passengers.length >= request.seats) {
      return res.status(400).json({
        success: false,
        message: '拼车已满员'
      });
    }

    // 检查是否已加入
    const alreadyJoined = request.passengers.some(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: '您已加入此拼车'
      });
    }

    request.passengers.push({
      userId: req.user._id,
      pickupLocation,
      joinedAt: new Date()
    });

    if (request.passengers.length >= request.seats) {
      request.status = 'full';
    }

    await request.save();

    // 通知车主
    emitToVillage(req.user.villageId, 'carpool-joined', {
      requestId: request._id,
      passenger: req.user.name,
      remainingSeats: request.seats - request.passengers.length
    });

    res.json({
      success: true,
      data: request,
      message: '加入拼车成功'
    });
  } catch (error) {
    console.error('加入拼车失败:', error);
    res.status(500).json({
      success: false,
      message: '加入拼车失败'
    });
  }
};

/**
 * ========== 设备共享模块 ==========
 */

/**
 * 获取共享设备
 */
exports.getSharedEquipment = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    const equipment = await SharedEquipment.find(filter)
      .populate('owner', 'name phone')
      .populate('currentBorrower', 'name phone')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('获取共享设备失败:', error);
    res.status(500).json({
      success: false,
      message: '获取共享设备失败'
    });
  }
};

/**
 * 添加共享设备
 */
exports.addSharedEquipment = async (req, res) => {
  try {
    const { name, type, description, dailyCost, deposit } = req.body;
    const imagePath = req.file ? req.file.path : null;

    const equipment = await SharedEquipment.create({
      villageId: req.user.villageId,
      owner: req.user._id,
      name,
      type,
      description,
      image: imagePath,
      dailyCost,
      deposit,
      status: 'available'
    });

    res.status(201).json({
      success: true,
      data: equipment,
      message: '设备添加成功'
    });
  } catch (error) {
    console.error('添加共享设备失败:', error);
    res.status(500).json({
      success: false,
      message: '添加共享设备失败'
    });
  }
};

/**
 * 借用设备
 */
exports.borrowEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnDate } = req.body;

    const equipment = await SharedEquipment.findById(id);

    if (!equipment || equipment.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    if (equipment.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: '设备当前不可用'
      });
    }

    equipment.status = 'borrowed';
    equipment.currentBorrower = req.user._id;
    equipment.borrowedAt = new Date();
    equipment.expectedReturnDate = new Date(returnDate);

    await equipment.save();

    res.json({
      success: true,
      data: equipment,
      message: '借用成功'
    });
  } catch (error) {
    console.error('借用设备失败:', error);
    res.status(500).json({
      success: false,
      message: '借用设备失败'
    });
  }
};

/**
 * 归还设备
 */
exports.returnEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition } = req.body;

    const equipment = await SharedEquipment.findById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    if (equipment.currentBorrower.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '您不是该设备的借用者'
      });
    }

    equipment.status = 'available';
    equipment.currentBorrower = null;
    equipment.borrowedAt = null;
    equipment.expectedReturnDate = null;
    equipment.condition = condition;

    await equipment.save();

    res.json({
      success: true,
      data: equipment,
      message: '归还成功'
    });
  } catch (error) {
    console.error('归还设备失败:', error);
    res.status(500).json({
      success: false,
      message: '归还设备失败'
    });
  }
};

/**
 * ========== 乡村活动圈 ==========
 */

/**
 * 获取活动列表
 */
exports.getActivities = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    const activities = await VillageActivity.find(filter)
      .populate('creator', 'name avatar')
      .populate('participants', 'name avatar')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('获取活动失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活动失败'
    });
  }
};

/**
 * 创建活动
 */
exports.createActivity = async (req, res) => {
  try {
    const { title, type, description, startTime, location, maxParticipants } = req.body;
    const images = req.files?.['images']?.map(f => f.path) || [];
    const video = req.files?.['video']?.[0]?.path || null;

    const activity = await VillageActivity.create({
      villageId: req.user.villageId,
      creator: req.user._id,
      title,
      type,
      description,
      images,
      video,
      startTime: new Date(startTime),
      location,
      maxParticipants,
      status: 'upcoming'
    });

    emitToVillage(req.user.villageId, 'activity-created', {
      activityId: activity._id,
      title: activity.title,
      type: activity.type,
      creator: req.user.name
    });

    res.status(201).json({
      success: true,
      data: activity,
      message: '活动创建成功'
    });
  } catch (error) {
    console.error('创建活动失败:', error);
    res.status(500).json({
      success: false,
      message: '创建活动失败'
    });
  }
};

/**
 * 参加活动
 */
exports.joinActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await VillageActivity.findById(id);

    if (!activity || activity.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    if (activity.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: '活动已结束或已取消'
      });
    }

    const alreadyJoined = activity.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: '您已参加此活动'
      });
    }

    if (activity.maxParticipants && activity.participants.length >= activity.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: '活动名额已满'
      });
    }

    activity.participants.push(req.user._id);
    await activity.save();

    // 添加积分奖励
    const PointsRecord = require('../models/PointsRecord');
    await PointsRecord.create({
      userId: req.user._id,
      villageId: req.user.villageId,
      type: 'activity',
      points: 5,
      description: `参加活动：${activity.title}`,
      relatedId: activity._id
    });

    res.json({
      success: true,
      data: activity,
      message: '报名成功'
    });
  } catch (error) {
    console.error('参加活动失败:', error);
    res.status(500).json({
      success: false,
      message: '参加活动失败'
    });
  }
};

/**
 * 点赞活动
 */
exports.likeActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await VillageActivity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    const alreadyLiked = activity.likes.some(
      l => l.toString() === req.user._id.toString()
    );

    if (alreadyLiked) {
      // 取消点赞
      activity.likes = activity.likes.filter(l => l.toString() !== req.user._id.toString());
    } else {
      // 点赞
      activity.likes.push(req.user._id);
    }

    await activity.save();

    res.json({
      success: true,
      data: activity,
      message: alreadyLiked ? '取消点赞' : '点赞成功'
    });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
};

/**
 * ========== 便民服务点 ==========
 */

exports.getServicePoints = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;

    const points = await ServicePoint.find(filter);

    res.json({
      success: true,
      data: points
    });
  } catch (error) {
    console.error('获取服务点失败:', error);
    res.status(500).json({
      success: false,
      message: '获取服务点失败'
    });
  }
};

exports.addServicePoint = async (req, res) => {
  try {
    const { name, type, address, phone, hours, services } = req.body;

    const point = await ServicePoint.create({
      villageId: req.user.villageId,
      name,
      type,
      address,
      phone,
      hours,
      services
    });

    res.status(201).json({
      success: true,
      data: point,
      message: '服务点添加成功'
    });
  } catch (error) {
    console.error('添加服务点失败:', error);
    res.status(500).json({
      success: false,
      message: '添加服务点失败'
    });
  }
};

/**
 * ========== 电商对接（助农专区） ==========
 */

exports.getAgriculturalProducts = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (category) filter.category = category;
    if (status) filter.status = status;

    const products = await AgriculturalProduct.find(filter)
      .populate('seller', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取农产品失败:', error);
    res.status(500).json({
      success: false,
      message: '获取农产品失败'
    });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, category, description, price, unit, stock } = req.body;
    const image = req.file ? req.file.path : null;

    const product = await AgriculturalProduct.create({
      villageId: req.user.villageId,
      seller: req.user._id,
      name,
      category,
      description,
      image,
      price,
      unit,
      stock,
      status: 'available'
    });

    res.status(201).json({
      success: true,
      data: product,
      message: '产品添加成功'
    });
  } catch (error) {
    console.error('添加产品失败:', error);
    res.status(500).json({
      success: false,
      message: '添加产品失败'
    });
  }
};
