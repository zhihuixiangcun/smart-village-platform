# 智慧乡村即时通讯功能集成文档

## 功能清单

### 前端组件 (Vue3)
✅ **VideoCall.vue** - 视频通话组件
- 本地/远程视频显示
- 静音/取消静音
- 开关摄像头
- 切换前后摄像头
- 通话时长显示

✅ **RedPacketModal.vue** - 红包弹窗组件
- 拼手气红包
- 普通红包
- 红包领取
- 红包过期处理

✅ **GiftModal.vue** - 礼物弹窗组件
- 9种虚拟礼物
- 礼物数量选择
- 礼物飞行动画

✅ **TransferModal.vue** - 转账弹窗组件
- 余额转账
- 支付密码验证
- 6位数字键盘

✅ **CouponModal.vue** - 卡券弹窗组件
- 我的卡券管理
- 卡券转赠
- 卡券状态显示

### 前端功能
✅ **相册功能**
- 单张图片选择
- 多张图片选择（最多9张）
- 图片预览

✅ **拍照功能**
- 调用后置摄像头
- 拍照自动发送
- 图片压缩优化

✅ **视频通话**
- WebRTC实时音视频
- 画中画显示
- 静音/视频控制
- 前后摄像头切换
- 通话状态管理

✅ **位置共享**
- 发送地理位置
- 腾讯地图集成
- 位置信息显示

✅ **红包功能**
- 发送拼手气红包
- 发送普通红包
- 领取红包
- 红包金额显示

✅ **礼物功能**
- 发送虚拟礼物
- 礼物动画效果
- 金币支付

✅ **转账功能**
- 余额转账
- 支付密码验证
- 转账记录

✅ **卡券功能**
- 我的卡券管理
- 卡券转赠
- 卡券过期提醒

### 后端API (Node.js)
✅ **server/api/chat.js** - 聊天API路由
- 会话管理 CRUD
- 消息发送（文本/图片/视频/语音/位置）
- 红包发送和领取
- 礼物发送
- 转账发送和接收
- 卡券发送和领取
- 消息撤回
- 已读状态管理

✅ **server/models/Message.js** - 消息模型
- 支持多种消息类型
- 文件信息存储
- 位置、红包、礼物、转账、卡券扩展字段
- 撤回状态管理

✅ **server/models/Conversation.js** - 会话模型
- 私聊和群聊类型
- 参与者管理
- 未读消息数
- 置顶和免打扰设置

✅ **server/models/User.js** - 用户模型
- 余额和金币系统
- 支付密码
- 卡券管理
- 在线状态
- 设备信息

### 数据模型
```
Message {
  conversationId: ObjectId,
  senderId: ObjectId,
  content: String,
  type: 'text' | 'image' | 'voice' | 'video' | 'location' | 'redpacket' | 'gift' | 'transfer' | 'coupon',
  status: 'sending' | 'sent' | 'failed',
  read: Boolean,
  recalled: Boolean,
  file: { originalName, filename, size, mimetype, url },
  duration: Number,
  location: { latitude, longitude, name, address, timestamp },
  redPacket: { id, type, amount, count, greeting, status, ... },
  gift: { id, giftId, name, icon, amount, ... },
  transfer: { id, amount, note, status, ... },
  coupon: { id, couponId, name, description, type, value, ... },
  createdAt: Date
}

Conversation {
  type: 'private' | 'group',
  name: String,
  avatar: String,
  participants: [ObjectId],
  ownerId: ObjectId,
  admins: [ObjectId],
  lastMessage: String,
  lastMessageTime: Date,
  unreadCount: Map,
  memberCount: Number,
  isPinned: Boolean,
  isMuted: Boolean,
  createdAt: Date,
  updatedAt: Date
}

User {
  name: String,
  phone: String,
  villageId: String,
  avatar: String,
  role: 'villager' | 'cadre' | 'admin',
  balance: Number,
  coins: Number,
  paymentPassword: String,
  online: Boolean,
  friendIds: [ObjectId],
  coupons: [...],
  settings: {...},
  createdAt: Date,
  updatedAt: Date
}
```

## API端点

### 会话管理
- `GET /api/chat/conversations` - 获取会话列表
- `GET /api/chat/conversations/:id` - 获取会话详情
- `POST /api/chat/conversations` - 创建新会话
- `DELETE /api/chat/conversations/:id` - 删除会话

### 消息操作
- `GET /api/chat/conversations/:conversationId/messages` - 获取消息列表
- `POST /api/chat/conversations/:conversationId/messages` - 发送文本消息
- `POST /api/chat/conversations/:conversationId/images` - 上传图片
- `POST /api/chat/conversations/:conversationId/videos` - 上传视频
- `POST /api/chat/conversations/:conversationId/voice` - 发送语音
- `POST /api/chat/conversations/:conversationId/location` - 发送位置
- `POST /api/chat/conversations/:conversationId/redpacket` - 发送红包
- `POST /api/chat/conversations/:conversationId/messages/:messageId/redpacket/open` - 领取红包
- `POST /api/chat/conversations/:conversationId/gift` - 发送礼物
- `POST /api/chat/conversations/:conversationId/transfer` - 发送转账
- `POST /api/chat/conversations/:conversationId/messages/:messageId/transfer/accept` - 接收转账
- `POST /api/chat/conversations/:conversationId/coupon` - 发送卡券
- `POST /api/chat/conversations/:conversationId/messages/:messageId/coupon/claim` - 领取卡券
- `POST /api/chat/conversations/:conversationId/read` - 标记已读
- `POST /api/chat/conversations/:conversationId/messages/:messageId/recall` - 撤回消息

### 文件上传
- 静态文件访问: `/uploads/chat/*`
- 支持类型: jpeg, jpg, png, gif, webp, mp4, webm, mp3, wav
- 文件大小限制: 10MB
- 图片数量限制: 9张

## Socket.IO事件

### 客户端发送
- `join-village` - 加入乡村房间
- `leave-village` - 离开乡村房间
- `send-announcement` - 发送公告
- `emergency-broadcast` - 应急广播
- `submit-suggestion` - 提交建议
- `village-message` - 村庄聊天
- `typing` - 输入指示

### 服务器推送
- `new-message` - 新消息推送
- `message_recalled` - 消息撤回通知
- `redpacket_opened` - 红包领取通知
- `transfer_accepted` - 转账接收通知
- `coupon_claimed` - 卡券领取通知
- `user-joined` - 用户加入会话
- `user-left` - 用户离开会话

## 文件结构

```
client-mobile/
├── src/
│   ├── pages/chat/
│   │   └── detail.vue
│   ├── components/chat/
│   │   ├── VideoCall.vue
│   │   ├── RedPacketModal.vue
│   │   ├── GiftModal.vue
│   │   ├── TransferModal.vue
│   │   └── CouponModal.vue
│   ├── store/
│   │   └── chat.js
│   └── api/
│       └── index.js
└── package.json

server/
├── api/
│   └── chat.js
├── models/
│   ├── Message.js
│   ├── Conversation.js
│   └── User.js
│   ├── uploads/
│   │   └── chat/
├── app.js
└── package.json
```

## 启动说明

### 后端启动
```bash
cd server
npm install
npm run dev
```
服务地址: http://localhost:5000

### 前端启动
```bash
cd client-mobile
npm install
npm run dev
```
服务地址: http://localhost:3002

### 访问地址
- 前端聊天: http://localhost:3002/chat/detail/conv_001
- 后端API: http://localhost:5000/api/chat/*
- 文件访问: http://localhost:5000/uploads/chat/*

## 依赖包

### 后端新增依赖
```json
{
  "multer": "^1.4.5",
  "uuid": "^9.0.0",
  "bcryptjs": "^2.4.3"
}
```

### 前端依赖
无需新增依赖，使用现有技术栈

## 开发状态

### 已完成 ✅
- [x] 前端所有组件开发
- [x] 前端功能集成
- [x] 后端API开发
- [x] 数据模型设计
- [x] 文件上传功能
- [x] Socket.IO事件定义

### 进行中 🚧
- [ ] 真实支付系统对接
- [ ] WebRTC信令服务器
- [ ] 文件存储到OSS
- [ ] 表情选择器UI
- [ ] 完整的JWT认证

### 待开始 ⏳
- [ ] 群组聊天功能
- [ ] 消息转发和引用
- [ ] 消息搜索
- [ ] 语音转文字
- [ ] 消息翻译
- [ ] 消息定时发送

## 测试计划

### 功能测试
1. 基础消息发送和接收
2. 图片上传和显示
3. 位置发送和地图查看
4. 红包发送和领取流程
5. 礼物发送和动画
6. 转账流程
7. 卡券转赠和领取

### 集成测试
1. 前后端API对接
2. 数据模型字段匹配
3. WebSocket实时通信
4. 文件上传流程
5. 错误处理和状态码

### 性能测试
1. 图片上传性能
2. 消息列表加载性能
3. WebSocket连接稳定性
4. 文件存储优化

## 注意事项

1. **安全**: 所有敏感操作需要JWT认证
2. **验证**: 文件上传需要类型和大小验证
3. **加密**: 支付密码使用bcrypt加密
4. **存储**: 生产环境使用OSS/CDN存储文件
5. **WebRTC**: 需要配置STUN/TURN服务器支持NAT
6. **兼容性**: 移动端需要测试iOS/Android兼容性

## 联系支持

- 开发文档: 查看 CHAT_INTEGRATION_GUIDE.md
- 测试指南: 查看 CHAT_FEATURES_TEST_GUIDE.md
- 产品文档: 查看 PRD.md

---

**文档版本**: V1.0
**最后更新**: 2025-01-17
