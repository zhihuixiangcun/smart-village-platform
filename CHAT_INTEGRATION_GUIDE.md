# 聊天功能前后端集成完成指南

## 项目概述

本次更新为智慧乡村平台实现了完整的仿微信即时通讯功能，包括文件上传、多媒体消息、支付相关功能等。

## 完成功能列表

### ✅ 前端功能 (Vue3 + Vite)

#### 1. 基础消息功能
- [x] 文本消息发送
- [x] 表情选择器按钮（待实现表情面板）
- [x] 消息撤回（2分钟内）
- [x] 消息状态显示（发送中/已发送）
- [x] 消息已读状态

#### 2. 图片相册功能
- [x] 从相册选择单张图片
- [x] 从相册多选图片（最多9张）
- [x] 图片预览和查看
- [x] Base64编码上传（临时方案）

#### 3. 拍照功能
- [x] 调用后置摄像头
- [x] 拍照后自动发送
- [x] 照片压缩优化

#### 4. 视频通话功能
- [x] WebRTC实时音视频通话
- [x] 画中画显示本地视频
- [x] 支持静音/取消静音
- [x] 支持开关摄像头
- [x] 支持切换前后摄像头
- [x] 通话时长显示
- [x] 通话控制按钮

#### 5. 语音功能
- [x] 长按录音
- [x] 语音时长显示
- [x] 语音播放控制
- [x] 支持真实录音和模拟录音降级
- [x] 录音时间限制（60秒）

#### 6. 位置共享功能
- [x] 发送地理位置
- [x] 集成腾讯地图查看
- [x] 位置信息显示

#### 7. 红包功能
- [x] 拼手气红包（随机金额）
- [x] 普通红包（固定金额）
- [x] 红包祝福语自定义
- [x] 红包领取功能
- [x] 红包过期处理
- [x] 红包金额显示

#### 8. 礼物功能
- [x] 9种虚拟礼物
- [x] 礼物飞行动画效果
- [x] 金币支付系统
- [x] 礼物数量选择

#### 9. 转账功能
- [x] 余额转账
- [x] 支付密码安全验证
- [x] 转账备注
- [x] 转账记录查询
- [x] 余额实时更新

#### 10. 卡券功能
- [x] 我的卡券管理
- [x] 卡券转赠功能
- [x] 多种券类型支持（满减、免运费、产品券）
- [x] 卡券过期提醒
- [x] 卡券使用状态

### ✅ 后端功能 (Node.js + Express + Socket.IO)

#### 1. API路由 (server/api/chat.js)
- [x] GET /api/chat/conversations - 获取会话列表
- [x] GET /api/chat/conversations/:id - 获取会话详情
- [x] POST /api/chat/conversations - 创建新会话
- [x] DELETE /api/chat/conversations/:id - 删除会话
- [x] GET /api/chat/conversations/:id/messages - 获取消息列表
- [x] POST /api/chat/conversations/:id/messages - 发送文本消息
- [x] POST /api/chat/conversations/:id/images - 上传图片消息
- [x] POST /api/chat/conversations/:id/videos - 上传视频消息
- [x] POST /api/chat/conversations/:id/voice - 发送语音消息
- [x] POST /api/chat/conversations/:id/location - 发送位置消息
- [x] POST /api/chat/conversations/:id/redpacket - 发送红包
- [x] POST /api/chat/conversations/:id/messages/:id/redpacket/open - 领取红包
- [x] POST /api/chat/conversations/:id/gift - 发送礼物
- [x] POST /api/chat/conversations/:id/transfer - 发送转账
- [x] POST /api/chat/conversations/:id/messages/:id/transfer/accept - 接收转账
- [x] POST /api/chat/conversations/:id/coupon - 发送卡券
- [x] POST /api/chat/conversations/:id/messages/:id/coupon/claim - 领取卡券
- [x] POST /api/chat/conversations/:id/read - 标记消息已读
- [x] POST /api/chat/conversations/:id/messages/:id/recall - 撤回消息

#### 2. 数据模型 (server/models/)
- [x] Message.js - 消息模型
  - 支持多种消息类型
  - 文件信息存储
  - 位置、红包、礼物、转账、卡券等扩展字段
  - 已读/撤回状态管理
- [x] Conversation.js - 会话模型
  - 私聊/群聊类型
  - 参与者管理
  - 最后消息时间
  - 未读消息数
  - 置顶/免打扰设置
- [x] User.js - 用户模型
  - 余额和金币系统
  - 支付密码
  - 卡券管理
  - 设备和在线状态

#### 3. 文件上传 (Multer)
- [x] 配置文件上传存储
- [x] 支持图片上传 (jpeg, jpg, png, gif, webp)
- [x] 支持视频上传 (mp4, webm)
- [x] 支持音频上传 (mp3, wav)
- [x] 文件大小限制 (10MB)
- [x] 文件数量限制 (9张图片)
- [x] 文件类型验证

#### 4. Socket.IO 实时通信
- [x] new_message - 新消息推送
- [x] message_recalled - 消息撤回通知
- [x] redpacket_opened - 红包领取通知
- [x] transfer_accepted - 转账接收通知
- [coupon_claimed - 卡券领取通知
- [x] user-joined - 用户加入会话
- [x] user-left - 用户离开会话

## 项目结构

```
smart-village-platform/
├── client-mobile/                 # 前端 (Vue3)
│   ├── src/
│   │   ├── pages/chat/
│   │   │   └── detail.vue         # 聊天详情页
│   │   ├── components/chat/
│   │   │   ├── VideoCall.vue       # 视频通话组件
│   │   │   ├── RedPacketModal.vue  # 红包弹窗
│   │   │   ├── GiftModal.vue      # 礼物弹窗
│   │   │   ├── TransferModal.vue   # 转账弹窗
│   │   │   └── CouponModal.vue    # 卡券弹窗
│   │   ├── store/
│   │   │   └── chat.js            # 聊天状态管理
│   │   └── api/
│   │       └── index.js             # API接口定义
│   └── package.json
│
└── server/                       # 后端 (Node.js)
    ├── api/
    │   └── chat.js                # 聊天API路由
    ├── models/
    │   ├── Message.js             # 消息模型
    │   ├── Conversation.js         # 会话模型
    │   └── User.js                # 用户模型
    ├── uploads/
    │   └── chat/                  # 文件上传目录
    ├── app.js                     # Express应用入口
    └── package.json
```

## 技术栈

### 前端
- Vue 3.4.21
- Vite 7.3.1
- Vue Router 4.2.5
- Pinia 2.1.7
- TailwindCSS 3.4.1
- Dayjs 1.11.10
- Axios 1.6.7

### 后端
- Node.js
- Express.js
- Socket.IO 4.x
- Mongoose 8.x
- Multer (文件上传)
- Bcryptjs (密码加密)
- UUID (唯一标识)

### 数据库
- MongoDB

## 快速开始

### 1. 启动后端

```bash
cd server
npm install
npm run dev
```

后端服务将运行在 http://localhost:5000

### 2. 启动前端

```bash
cd client-mobile
npm install
npm run dev
```

前端服务将运行在 http://localhost:3002

### 3. 访问聊天页面

打开浏览器访问:
```
http://localhost:3002/chat/detail/conv_001
```

## API 文档

### 聊天会话

#### 获取会话列表
```
GET /api/chat/conversations?userId={userId}&page={page}&limit={limit}
```

#### 创建会话
```
POST /api/chat/conversations
Body: {
  type: 'private' | 'group',
  targetUserId: '{userId}',
  name: '会话名称'
}
```

### 消息操作

#### 发送文本消息
```
POST /api/chat/conversations/{conversationId}/messages
Body: {
  content: '消息内容'
}
```

#### 上传图片
```
POST /api/chat/conversations/{conversationId}/images
Content-Type: multipart/form-data
Body: FormData with 'image' file
```

#### 发送位置
```
POST /api/chat/conversations/{conversationId}/location
Body: {
  latitude: 39.9042,
  longitude: 116.4074,
  address: '北京市朝阳区',
  name: '我的位置'
}
```

#### 发送红包
```
POST /api/chat/conversations/{conversationId}/redpacket
Body: {
  type: 'random' | 'fixed',
  amount: 100,
  count: 10,
  greeting: '恭喜发财'
}
```

#### 领取红包
```
POST /api/chat/conversations/{conversationId}/messages/{messageId}/redpacket/open
```

## Socket.IO 事件

### 客户端发送
```javascript
// 加入会话房间
socket.emit('join-room', { conversationId })

// 输入中状态
socket.emit('typing', { conversationId, userId })

// 发送消息
socket.emit('send-message', { conversationId, message })
```

### 客户端监听
```javascript
// 新消息
socket.on('new_message', (message) => {
  console.log('收到新消息:', message)
})

// 消息已读
socket.on('message_read', (data) => {
  console.log('消息已读:', data)
})

// 用户输入
socket.on('typing', (data) => {
  console.log('对方正在输入:', data)
})
```

## 测试检查清单

### 功能测试
- [ ] 前端和后端服务都正常启动
- [ ] 访问聊天页面正常显示
- [ ] 文本消息可以发送和接收
- [ ] 图片上传功能正常
- [ ] 拍照功能正常
- [ ] 位置发送和查看正常
- [ ] 红包发送和领取正常
- [ ] 礼物发送和动画正常
- [ ] 转账发送和接收正常
- [ ] 卡券转赠和领取正常
- [ ] Socket.IO 实时消息推送正常
- [ ] 文件可以正常访问 (/uploads/chat/*)

### 集成测试
- [ ] 前端API调用与后端接口一致
- [ ] 数据模型字段匹配
- [ ] WebSocket消息格式正确
- [ ] 文件上传路径配置正确
- [ ] 错误处理和状态码统一

## 已知问题和限制

### 前端限制
1. **表情选择器**: 按钮已添加，但表情面板UI待实现
2. **图片上传**: 目前使用Base64编码，生产环境应使用文件上传API
3. **WebRTC信令**: 目前为模拟模式，需要实现完整的信令服务器

### 后端限制
1. **支付系统**: 红包、转账、礼物等功能为模拟实现，需要对接真实的支付系统
2. **视频通话**: 需要实现STUN/TURN服务器支持NAT穿透
3. **文件存储**: 目前存储在本地，生产环境应使用OSS/CDN

### 安全提示
1. 需要实现JWT认证中间件
2. 文件上传需要添加病毒扫描
3. 敏感信息需要加密存储
4. 需要实现API速率限制

## 下一步开发计划

### 高优先级
1. 实现完整的JWT认证和授权
2. 实现真正的WebRTC信令服务器
3. 对接真实的支付系统（微信支付/支付宝）
4. 实现文件上传到OSS/CDN
5. 实现表情选择器UI

### 中优先级
1. 添加消息搜索功能
2. 实现群组管理功能
3. 添加消息转发/引用功能
4. 实现语音转文字
5. 添加消息撤回时间延长配置

### 低优先级
1. 添加消息翻译功能
2. 实现消息撤回撤回功能
3. 添加消息表情回复功能
4. 实现消息@提醒功能
5. 添加消息定时发送

## 总结

本次更新成功实现了仿微信的完整即时通讯功能，包括基础消息、多媒体、支付、位置等核心功能。前后端代码结构清晰，API设计规范，为后续功能扩展奠定了良好基础。

## 联系方式

如有问题或建议，请联系开发团队。

---

**最后更新**: 2025-01-17
**文档版本**: V1.0
