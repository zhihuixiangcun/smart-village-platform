/**
 * 村级应急响应系统控制器
 * P2功能模块 - 村级应急响应
 */

const EmergencyPlan = require('../models/EmergencyPlan');
const EmergencyEquipment = require('../models/EmergencyEquipment');
const EmergencyDrill = require('../models/EmergencyDrill');
const EmergencyTeam = require('../models/EmergencyTeam');
const { emitToVillage, broadcastToAll } = require('../services/socketService');

/**
 * 获取所有应急预案
 */
exports.getPlans = async (req, res) => {
  try {
    const { villageId, type, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    const plans = await EmergencyPlan.find(filter)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('获取应急预案失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急预案失败'
    });
  }
};

/**
 * 创建应急预案
 */
exports.createPlan = async (req, res) => {
  try {
    const { name, type, description, procedures, contacts } = req.body;

    const plan = await EmergencyPlan.create({
      villageId: req.user.villageId,
      name,
      type,
      description,
      procedures,
      contacts,
      createdBy: req.user._id
    });

    // 通知村委成员
    emitToVillage(req.user.villageId, 'emergency-plan-created', {
      planId: plan._id,
      name: plan.name,
      createdBy: req.user.name
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: '应急预案创建成功'
    });
  } catch (error) {
    console.error('创建应急预案失败:', error);
    res.status(500).json({
      success: false,
      message: '创建应急预案失败'
    });
  }
};

/**
 * 更新应急预案
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: req.user._id };

    const plan = await EmergencyPlan.findOneAndUpdate(
      { _id: id, villageId: req.user.villageId },
      updateData,
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '预案不存在'
      });
    }

    res.json({
      success: true,
      data: plan,
      message: '预案更新成功'
    });
  } catch (error) {
    console.error('更新预案失败:', error);
    res.status(500).json({
      success: false,
      message: '更新预案失败'
    });
  }
};

/**
 * 删除应急预案
 */
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await EmergencyPlan.findOneAndDelete({
      _id: id,
      villageId: req.user.villageId
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '预案不存在'
      });
    }

    res.json({
      success: true,
      message: '预案删除成功'
    });
  } catch (error) {
    console.error('删除预案失败:', error);
    res.status(500).json({
      success: false,
      message: '删除预案失败'
    });
  }
};

/**
 * 激活应急预案（一键启动）
 */
exports.activatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { severity, location, description } = req.body;

    const plan = await EmergencyPlan.findOne({
      _id: planId,
      villageId: req.user.villageId
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '预案不存在'
      });
    }

    // 创建应急事件记录
    const EmergencyEvent = require('../models/EmergencyEvent');
    const event = await EmergencyEvent.create({
      villageId: req.user.villageId,
      planId: plan._id,
      planName: plan.name,
      type: plan.type,
      severity,
      location,
      description,
      status: 'active',
      activatedBy: req.user._id,
      procedures: plan.procedures
    });

    // 发送全村紧急广播
    broadcastToAll(req.user.villageId, 'emergency-alert', {
      eventId: event._id,
      type: plan.type,
      severity,
      location,
      message: `${plan.name}已启动，请按照预案流程行动`,
      procedures: plan.procedures
    });

    // 通知上级政府
    emitToVillage(req.user.villageId, 'government-emergency-report', {
      villageId: req.user.villageId,
      eventType: plan.type,
      severity,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: event,
      message: '预案已启动，紧急广播已发送'
    });
  } catch (error) {
    console.error('启动预案失败:', error);
    res.status(500).json({
      success: false,
      message: '启动预案失败'
    });
  }
};

/**
 * 获取救援设备列表
 */
exports.getEquipment = async (req, res) => {
  try {
    const { type, status, location } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (location) filter.location = { $regex: location, $options: 'i' };

    const equipment = await EmergencyEquipment.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('获取救援设备失败:', error);
    res.status(500).json({
      success: false,
      message: '获取救援设备失败'
    });
  }
};

/**
 * 添加救援设备
 */
exports.addEquipment = async (req, res) => {
  try {
    const { name, type, quantity, location, coordinates, expiryDate, notes } = req.body;

    const equipment = await EmergencyEquipment.create({
      villageId: req.user.villageId,
      name,
      type,
      quantity,
      location,
      coordinates,
      expiryDate,
      notes
    });

    res.status(201).json({
      success: true,
      data: equipment,
      message: '设备添加成功'
    });
  } catch (error) {
    console.error('添加设备失败:', error);
    res.status(500).json({
      success: false,
      message: '添加设备失败'
    });
  }
};

/**
 * 更新救援设备
 */
exports.updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const equipment = await EmergencyEquipment.findOneAndUpdate(
      { _id: id, villageId: req.user.villageId },
      updateData,
      { new: true }
    );

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    res.json({
      success: true,
      data: equipment,
      message: '设备更新成功'
    });
  } catch (error) {
    console.error('更新设备失败:', error);
    res.status(500).json({
      success: false,
      message: '更新设备失败'
    });
  }
};

/**
 * 删除救援设备
 */
exports.deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    await EmergencyEquipment.findOneAndDelete({
      _id: id,
      villageId: req.user.villageId
    });

    res.json({
      success: true,
      message: '设备删除成功'
    });
  } catch (error) {
    console.error('删除设备失败:', error);
    res.status(500).json({
      success: false,
      message: '删除设备失败'
    });
  }
};

/**
 * 按位置查询设备
 */
exports.getEquipmentByLocation = async (req, res) => {
  try {
    const { lat, lng, radius, type } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;

    // 如果提供了坐标和半径，进行地理空间查询
    if (lat && lng && radius) {
      filter.coordinates = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) || 1000 // 默认1公里
        }
      };
    }

    const equipment = await EmergencyEquipment.find(filter);

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('查询设备位置失败:', error);
    res.status(500).json({
      success: false,
      message: '查询设备位置失败'
    });
  }
};

/**
 * 获取应急演练记录
 */
exports.getDrills = async (req, res) => {
  try {
    const { year, type } = req.query;
    const filter = { villageId: req.user.villageId };

    if (year) {
      filter.startTime = {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${parseInt(year) + 1}-01-01`)
      };
    }
    if (type) filter.type = type;

    const drills = await EmergencyDrill.find(filter)
      .populate('participants', 'name')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: drills
    });
  } catch (error) {
    console.error('获取演练记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取演练记录失败'
    });
  }
};

/**
 * 创建应急演练记录
 */
exports.createDrill = async (req, res) => {
  try {
    const { name, type, startTime, endTime, participants, summary } = req.body;

    const drill = await EmergencyDrill.create({
      villageId: req.user.villageId,
      name,
      type,
      startTime,
      endTime,
      participants,
      summary,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: drill,
      message: '演练记录创建成功'
    });
  } catch (error) {
    console.error('创建演练记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建演练记录失败'
    });
  }
};

/**
 * 获取应急队伍
 */
exports.getTeams = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    const teams = await EmergencyTeam.find(filter)
      .populate('leader', 'name phone')
      .populate('members', 'name phone');

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('获取应急队伍失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急队伍失败'
    });
  }
};

/**
 * 创建应急队伍
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, type, leader, members, description } = req.body;

    const team = await EmergencyTeam.create({
      villageId: req.user.villageId,
      name,
      type,
      leader,
      members,
      description
    });

    res.status(201).json({
      success: true,
      data: team,
      message: '应急队伍创建成功'
    });
  } catch (error) {
    console.error('创建应急队伍失败:', error);
    res.status(500).json({
      success: false,
      message: '创建应急队伍失败'
    });
  }
};

/**
 * 发送紧急广播
 */
exports.sendEmergencyBroadcast = async (req, res) => {
  try {
    const { title, message, severity, targetVillages } = req.body;

    const broadcastData = {
      title,
      message,
      severity,
      senderId: req.user._id,
      senderName: req.user.name,
      timestamp: new Date(),
      villageId: req.user.villageId
    };

    // 发送到目标村庄
    if (targetVillages && targetVillages.length > 0) {
      targetVillages.forEach(villageId => {
        emitToVillage(villageId, 'emergency-broadcast', broadcastData);
      });
    } else {
      // 发送到本村
      broadcastToAll(req.user.villageId, 'emergency-broadcast', broadcastData);
    }

    res.json({
      success: true,
      message: '紧急广播已发送'
    });
  } catch (error) {
    console.error('发送紧急广播失败:', error);
    res.status(500).json({
      success: false,
      message: '发送紧急广播失败'
    });
  }
};
