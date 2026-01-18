const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // 所属会话
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // 发送者
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 发送者信息（快照）
  senderName: {
    type: String,
    default: ''
  },

  senderAvatar: {
    type: String,
    default: ''
  },

  // 消息内容
  content: {
    type: String,
    required: true
  },

  // 消息类型：text | image | voice | video | location | redpacket | gift | transfer | coupon | recall
  type: {
    type: String,
    enum: ['text', 'image', 'voice', 'video', 'location', 'redpacket', 'gift', 'transfer', 'coupon', 'recall'],
    required: true
  },

  // 消息状态：sending | sent | failed
  status: {
    type: String,
    enum: ['sending', 'sent', 'failed'],
    default: 'sent'
  },

  // 是否已读
  read: {
    type: Boolean,
    default: false
  },

  // 已读时间
  readAt: {
    type: Date
  },

  // 是否是撤回消息
  recalled: {
    type: Boolean,
    default: false
  },

  // 撤回时间
  recalledAt: {
    type: Date
  },

  // 文件信息
  file: {
    originalName: String,
    filename: String,
    size: Number,
    mimetype: String,
    url: String
  },

  // 语音时长（秒）
  duration: {
    type: Number
  },

  // 位置信息
  location: {
    latitude: Number,
    longitude: Number,
    name: String,
    address: String,
    timestamp: Date
  },

  // 红包信息
  redPacket: {
    id: String,
    type: {
      type: String,
      enum: ['random', 'fixed']
    },
    amount: Number,
    count: Number,
    greeting: String,
    status: {
      type: String,
      enum: ['pending', 'received', 'expired']
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receivedAmount: Number,
    receivedAt: Date,
    createdAt: Date
  },

  // 礼物信息
  gift: {
    id: String,
    giftId: String,
    name: String,
    icon: String,
    amount: Number,
    totalPrice: Number,
    createdAt: Date
  },

  // 转账信息
  transfer: {
    id: String,
    amount: Number,
    note: String,
    status: {
      type: String,
      enum: ['sent', 'received', 'rejected']
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receivedAt: Date,
    createdAt: Date
  },

  // 卡券信息
  coupon: {
    id: String,
    couponId: String,
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['discount', 'shipping', 'product']
    },
    value: Number,
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    claimedAt: Date,
    createdAt: Date
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// 索引
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

// 实例方法 - 撤回消息
messageSchema.methods.recall = async function() {
  this.recalled = true;
  this.recalledAt = new Date();
  this.content = ''; // 清空内容
  return await this.save();
};

// 静态方法 - 获取会话消息
messageSchema.statics.getConversationMessages = async function(conversationId, options = {}) {
  const { userId, limit = 50, before, after } = options;

  const query = { conversationId };

  // 时间过滤
  if (before) {
    query.createdAt = { $lt: before };
  } else if (after) {
    query.createdAt = { $gt: after };
  }

  // 获取消息
  let messages = await this.find(query)
    .populate('senderId', 'username profile.nickName profile.avatar')
    .sort({ createdAt: -1 })
    .limit(limit);

  // 格式化消息
  messages = messages.map(msg => {
    const formatted = msg.toObject();

    // 添加isSelf字段
    formatted.isSelf = formatted.senderId._id.toString() === (userId && userId.toString());

    // 转换senderId为sender对象
    formatted.sender = {
      id: formatted.senderId._id,
      name: formatted.senderId.username || formatted.senderId.profile?.nickName || '未知用户',
      avatar: formatted.senderId.profile?.avatar || '👤'
    };
    delete formatted.senderId;

    // 根据消息类型格式化内容
    if (formatted.type === 'location') {
      formatted.content = {
        latitude: formatted.location?.latitude,
        longitude: formatted.location?.longitude,
        name: formatted.location?.name,
        address: formatted.location?.address
      };
    } else if (formatted.type === 'voice') {
      // content 保持为音频URL
    } else if (formatted.type === 'image') {
      // content 保持为图片URL
    } else if (formatted.type === 'redpacket') {
      formatted.content = {
        id: formatted.redPacket?.id,
        greeting: formatted.redPacket?.greeting || '恭喜发财，大吉大利',
        status: formatted.redPacket?.status || 'pending',
        amount: formatted.redPacket?.amount
      };
    } else if (formatted.type === 'gift') {
      formatted.content = {
        name: formatted.gift?.name,
        icon: formatted.gift?.icon,
        amount: formatted.gift?.amount
      };
    } else if (formatted.type === 'transfer') {
      formatted.content = {
        amount: formatted.transfer?.amount,
        status: formatted.transfer?.status || 'sent'
      };
    } else if (formatted.type === 'coupon') {
      formatted.content = {
        name: formatted.coupon?.name,
        description: formatted.coupon?.description
      };
    } else if (formatted.type === 'recall') {
      formatted.content = '消息已撤回';
    }

    // 添加时间戳字符串
    formatted.timestamp = formatted.createdAt.toISOString();

    return formatted;
  });

  return messages;
};

// 静态方法 - 批量标记已读
messageSchema.statics.markConversationAsRead = async function(conversationId, userId, beforeDate) {
  const result = await this.updateMany(
    {
      conversationId,
      senderId: { $ne: userId }, // 不是自己发的消息
      read: false,
      createdAt: { $lt: beforeDate || new Date() }
    },
    {
      read: true,
      readAt: new Date()
    }
  );
  return result.modifiedCount;
};

module.exports = mongoose.model('Message', messageSchema);
