const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { calculateTotalPrice, getGiftInfo } = require('../config/giftConfig');
const User = require('../models/User');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 9 // 最多9张图片
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav/;
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if (allowedTypes.test(extname) && allowedTypes.test(mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

/**
 * 获取会话列表
 */
router.get('/conversations', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;

    const query = { participants: userId };
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find(query)
      .sort({ lastMessageTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('lastMessage')
      .populate('participants', 'name avatar online')
      .exec();

    const total = await Conversation.countDocuments(query);

    res.json({
      success: true,
      data: {
        list: conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话列表失败',
      error: error.message
    });
  }
});

/**
 * 获取会话详情
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id)
      .populate('participants')
      .populate('lastMessage')
      .exec();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('获取会话详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话详情失败',
      error: error.message
    });
  }
});

/**
 * 创建新会话
 */
router.post('/conversations', async (req, res) => {
  try {
    const { type, targetUserId, name } = req.body;
    const userId = req.user.id;

    let conversation;

    if (type === 'private') {
      // 检查是否已存在私聊
      conversation = await Conversation.findOne({
        type: 'private',
        participants: { $all: [userId, targetUserId], $size: 2 }
      });

      if (conversation) {
        return res.json({
          success: true,
          message: '会话已存在',
          data: conversation
        });
      }
    }

    conversation = new Conversation({
      type,
      name: type === 'private' ? name : name,
      participants: [userId, targetUserId],
      createdBy: userId,
      lastMessageTime: new Date()
    });

    await conversation.save();

    // 通知目标用户
    const { io } = require('../../app');
    io.to(targetUserId).emit('new_conversation', conversation);

    res.json({
      success: true,
      message: '会话创建成功',
      data: conversation
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      message: '创建会话失败',
      error: error.message
    });
  }
});

/**
 * 删除会话
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    // 检查权限
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权限删除此会话'
      });
    }

    await Conversation.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '会话删除成功'
    });
  } catch (error) {
    console.error('删除会话失败:', error);
    res.status(500).json({
      success: false,
      message: '删除会话失败',
      error: error.message
    });
  }
});

/**
 * 获取会话消息
 */
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('senderId', 'name avatar')
      .exec();

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        list: messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取消息失败',
      error: error.message
    });
  }
});

/**
 * 发送文本消息
 */
router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    const message = new Message({
      conversationId,
      senderId: userId,
      content: content.trim(),
      type: 'text',
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content.trim(),
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: '发送消息失败',
      error: error.message
    });
  }
});

/**
 * 上传并发送图片
 */
router.post('/conversations/:conversationId/images', upload.single('image'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const imageUrl = `/uploads/chat/${req.file.filename}`;

    const message = new Message({
      conversationId,
      senderId: userId,
      content: imageUrl,
      type: 'image',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: imageUrl
      },
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[图片]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '图片发送成功',
      data: message
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({
      success: false,
      message: '上传图片失败',
      error: error.message
    });
  }
});

/**
 * 上传并发送视频
 */
router.post('/conversations/:conversationId/videos', upload.single('video'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的视频'
      });
    }

    const videoUrl = `/uploads/chat/${req.file.filename}`;

    const message = new Message({
      conversationId,
      senderId: userId,
      content: videoUrl,
      type: 'video',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: videoUrl
      },
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[视频]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '视频发送成功',
      data: message
    });
  } catch (error) {
    console.error('上传视频失败:', error);
    res.status(500).json({
      success: false,
      message: '上传视频失败',
      error: error.message
    });
  }
});

/**
 * 发送语音消息
 */
router.post('/conversations/:conversationId/voice', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { audioUrl, duration } = req.body;
    const userId = req.user.id;

    const message = new Message({
      conversationId,
      senderId: userId,
      content: audioUrl,
      type: 'voice',
      duration: duration,
      file: {
        url: audioUrl,
        duration: duration
      },
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[语音]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '语音发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送语音失败:', error);
    res.status(500).json({
      success: false,
      message: '发送语音失败',
      error: error.message
    });
  }
});

/**
 * 发送位置消息
 */
router.post('/conversations/:conversationId/location', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { latitude, longitude, address, name } = req.body;
    const userId = req.user.id;

    const locationData = {
      latitude,
      longitude,
      name: name || '我的位置',
      address: address || `${latitude},${longitude}`,
      timestamp: new Date().toISOString()
    };

    const message = new Message({
      conversationId,
      senderId: userId,
      content: JSON.stringify(locationData),
      type: 'location',
      location: locationData,
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[位置]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '位置发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送位置失败:', error);
    res.status(500).json({
      success: false,
      message: '发送位置失败',
      error: error.message
    });
  }
});

/**
 * 发送红包消息
 */
router.post('/conversations/:conversationId/redpacket', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { type, amount, count, greeting } = req.body;
    const userId = req.user.id;

    // TODO: 验证用户余额
    // TODO: 扣除用户余额

    const redPacketData = {
      id: `rp_${Date.now()}`,
      type: type, // 'random' | 'fixed'
      amount: parseFloat(amount),
      count: parseInt(count) || 1,
      greeting: greeting || '恭喜发财，大吉大利',
      status: 'pending',
      createdAt: new Date()
    };

    const message = new Message({
      conversationId,
      senderId: userId,
      content: JSON.stringify(redPacketData),
      type: 'redpacket',
      redPacket: redPacketData,
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[红包]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '红包发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送红包失败:', error);
    res.status(500).json({
      success: false,
      message: '发送红包失败',
      error: error.message
    });
  }
});

/**
 * 领取红包
 */
router.post('/conversations/:conversationId/messages/:messageId/redpacket/open', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message || message.type !== 'redpacket') {
      return res.status(404).json({
        success: false,
        message: '红包不存在'
      });
    }

    if (message.senderId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: '不能领取自己发送的红包'
      });
    }

    const redPacket = message.redPacket;

    if (redPacket.status === 'received') {
      return res.status(400).json({
        success: false,
        message: '红包已领取'
      });
    }

    if (redPacket.status === 'expired') {
      return res.status(400).json({
        success: false,
        message: '红包已过期'
      });
    }

    // 计算领取金额
    let receivedAmount;
    if (redPacket.type === 'fixed') {
      receivedAmount = redPacket.amount / redPacket.count;
    } else {
      // 随机金额
      receivedAmount = (Math.random() * redPacket.amount * 0.9 + redPacket.amount * 0.1);
    }

    // 更新红包状态
    redPacket.status = 'received';
    redPacket.receivedBy = userId;
    redPacket.receivedAmount = receivedAmount;
    redPacket.receivedAt = new Date();

    await message.save();

    // TODO: 增加用户余额

    // 通过Socket.IO通知
    const { io } = require('../../app');
    io.to(conversationId).emit('redpacket_opened', {
      messageId,
      userId,
      amount: receivedAmount
    });

    res.json({
      success: true,
      message: '红包领取成功',
      data: {
        amount: receivedAmount,
        redPacketId: redPacket.id
      }
    });
  } catch (error) {
    console.error('领取红包失败:', error);
    res.status(500).json({
      success: false,
      message: '领取红包失败',
      error: error.message
    });
  }
});

/**
 * 发送礼物消息
 */
router.post('/conversations/:conversationId/gift', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { giftId, name, icon, amount } = req.body;
    const userId = req.user.id;

    // 获取礼物信息并计算总价
    const giftInfo = getGiftInfo(giftId);
    if (!giftInfo) {
      return res.status(400).json({
        success: false,
        message: '无效的礼物类型'
      });
    }

    const giftAmount = parseInt(amount) || 1;
    const totalPrice = calculateTotalPrice(giftId, giftAmount);

    // 验证用户金币余额
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.coins < totalPrice) {
      return res.status(400).json({
        success: false,
        message: `金币余额不足，需要 ${totalPrice} 金币，当前余额 ${user.coins}`
      });
    }

    // 扣除用户金币
    user.coins -= totalPrice;
    await user.save();

    const giftData = {
      id: `gift_${Date.now()}`,
      giftId,
      name: name || giftInfo.name,
      icon: icon || giftInfo.icon,
      amount: giftAmount,
      unitPrice: giftInfo.price,
      totalPrice,
      createdAt: new Date()
    };

    const message = new Message({
      conversationId,
      senderId: userId,
      content: JSON.stringify(giftData),
      type: 'gift',
      gift: giftData,
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[礼物]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '礼物发送成功',
      data: {
        message,
        remainingCoins: user.coins
      }
    });
  } catch (error) {
    console.error('发送礼物失败:', error);
    res.status(500).json({
      success: false,
      message: '发送礼物失败',
      error: error.message
    });
  }
});

/**
 * 获取礼物列表
 */
router.get('/gifts', async (req, res) => {
  try {
    const { getAllGifts } = require('../config/giftConfig');
    const gifts = getAllGifts();

    // 按分类组织礼物
    const categorized = {
      free: [],
      common: [],
      delicate: [],
      luxury: [],
      legendary: []
    };

    Object.values(gifts).forEach(gift => {
      if (categorized[gift.category]) {
        categorized[gift.category].push(gift);
      }
    });

    res.json({
      success: true,
      data: categorized
    });
  } catch (error) {
    console.error('获取礼物列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取礼物列表失败',
      error: error.message
    });
  }
});

/**
 * 发送转账消息
 */
router.post('/conversations/:conversationId/transfer', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { amount, note } = req.body;
    const userId = req.user.id;

    // TODO: 验证支付密码
    // TODO: 验证用户余额
    // TODO: 扣除用户余额

    const transferData = {
      id: `transfer_${Date.now()}`,
      amount: parseFloat(amount),
      note: note || '',
      status: 'sent',
      createdAt: new Date()
    };

    const message = new Message({
      conversationId,
      senderId: userId,
      content: JSON.stringify(transferData),
      type: 'transfer',
      transfer: transferData,
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[转账]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '转账成功',
      data: message
    });
  } catch (error) {
    console.error('转账失败:', error);
    res.status(500).json({
      success: false,
      message: '转账失败',
      error: error.message
    });
  }
});

/**
 * 接收转账
 */
router.post('/conversations/:conversationId/messages/:messageId/transfer/accept', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message || message.type !== 'transfer') {
      return res.status(404).json({
        success: false,
        message: '转账不存在'
      });
    }

    const transfer = message.transfer;

    if (transfer.status === 'received') {
      return res.status(400).json({
        success: false,
        message: '转账已接收'
      });
    }

    // 更新转账状态
    transfer.status = 'received';
    transfer.receivedBy = userId;
    transfer.receivedAt = new Date();

    await message.save();

    // TODO: 增加接收方余额

    // 通过Socket.IO通知
    const { io } = require('../../app');
    io.to(conversationId).emit('transfer_accepted', {
      messageId,
      userId,
      amount: transfer.amount
    });

    res.json({
      success: true,
      message: '转账接收成功',
      data: transfer
    });
  } catch (error) {
    console.error('接收转账失败:', error);
    res.status(500).json({
      success: false,
      message: '接收转账失败',
      error: error.message
    });
  }
});

/**
 * 发送卡券消息
 */
router.post('/conversations/:conversationId/coupon', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { couponId, name, description, type, value } = req.body;
    const userId = req.user.id;

    // TODO: 验证用户是否有该卡券
    // TODO: 扣除用户卡券

    const couponData = {
      id: `coupon_${Date.now()}`,
      couponId,
      name,
      description,
      type, // 'discount' | 'shipping' | 'product'
      value,
      from: userId,
      createdAt: new Date()
    };

    const message = new Message({
      conversationId,
      senderId: userId,
      content: JSON.stringify(couponData),
      type: 'coupon',
      coupon: couponData,
      status: 'sent',
      createdAt: new Date()
    });

    await message.save();

    // 更新会话信息
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '[卡券]',
      lastMessageTime: new Date()
    });

    // 通过Socket.IO发送消息
    const { io } = require('../../app');
    io.to(conversationId).emit('new_message', message);

    res.json({
      success: true,
      message: '卡券发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送卡券失败:', error);
    res.status(500).json({
      success: false,
      message: '发送卡券失败',
      error: error.message
    });
  }
});

/**
 * 接收卡券
 */
router.post('/conversations/:conversationId/messages/:messageId/coupon/claim', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message || message.type !== 'coupon') {
      return res.status(404).json({
        success: false,
        message: '卡券不存在'
      });
    }

    const coupon = message.coupon;

    // TODO: 增加用户卡券

    // 更新卡券状态
    coupon.to = userId;
    coupon.claimedAt = new Date();

    await message.save();

    // 通过Socket.IO通知
    const { io } = require('../../app');
    io.to(conversationId).emit('coupon_claimed', {
      messageId,
      from: coupon.from,
      to: userId
    });

    res.json({
      success: true,
      message: '卡券领取成功',
      data: coupon
    });
  } catch (error) {
    console.error('领取卡券失败:', error);
    res.status(500).json({
      success: false,
      message: '领取卡券失败',
      error: error.message
    });
  }
});

/**
 * 标记消息已读
 */
router.post('/conversations/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: '消息已标记为已读'
    });
  } catch (error) {
    console.error('标记消息已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记消息已读失败',
      error: error.message
    });
  }
});

/**
 * 撤回消息
 */
router.post('/conversations/:conversationId/messages/:messageId/recall', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 检查权限
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权限撤回此消息'
      });
    }

    // 检查时间限制（2分钟内可撤回）
    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffMinutes = (now - messageTime) / (1000 * 60);

    if (diffMinutes > 2) {
      return res.status(400).json({
        success: false,
        message: '超过撤回时间限制（2分钟）'
      });
    }

    // 撤回消息
    message.recalled = true;
    message.content = '消息已撤回';
    message.recalledAt = new Date();

    await message.save();

    // 通过Socket.IO通知
    const { io } = require('../../app');
    io.to(conversationId).emit('message_recalled', {
      messageId,
      conversationId
    });

    res.json({
      success: true,
      message: '消息撤回成功'
    });
  } catch (error) {
    console.error('撤回消息失败:', error);
    res.status(500).json({
      success: false,
      message: '撤回消息失败',
      error: error.message
    });
  }
});

module.exports = router;
