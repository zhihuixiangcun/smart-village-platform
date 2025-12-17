# 📨 消息模板系统使用指南

## 🎯 **系统概述**

消息模板系统是智慧乡村通知服务的核心组件，提供灵活、强大的消息模板管理和渲染功能。支持变量替换、条件逻辑、多语言方言转换和多渠道发送。

## 🚀 **快速开始**

### 1. **查看预定义模板**
```javascript
const NotificationsService = require('./server/services/notificationsService');

// 获取所有模板
const templates = NotificationsService.getAllTemplates();
console.log(`共有 ${templates.length} 个模板`);

// 按类别获取模板
const emergencyTemplates = NotificationsService.getTemplatesByCategory('emergency');
```

### 2. **使用预定义模板发送通知**
```javascript
const result = await NotificationsService.sendWithTemplate(
  'emergency_typhoon',
  {
    village: { name: '幸福村' },
    typhoon: { name: '海燕', arrivalTime: '今晚8点' },
    contact: { emergency: '110' }
  },
  {
    phone: '13800138000',
    email: 'villager@example.com',
    deviceToken: 'fcm_token_123'
  }
);
```

### 3. **预览模板渲染**
```javascript
const preview = NotificationsService.previewTemplate(
  'announcement_meeting',
  {
    village: { name: '和谐村' },
    meeting: {
      date: '2024年3月15日',
      time: '晚上7点',
      location: '村委会',
      agenda: '讨论春节活动'
    }
  }
);

console.log(preview.message);
```

## 📋 **预定义模板列表**

### 🚨 **紧急通知类 (emergency)**

#### 1. **emergency_typhoon** - 台风预警
- **变量**: village.name, typhoon.name, typhoon.arrivalTime, contact.emergency
- **渠道**: SMS, Push, 广播
- **示例**:
  ```
  🌪️【紧急通知】幸福村：台风"海燕"即将影响我村，预计今晚8点抵达。
  请村民立即：1）关闭门窗 2）储备生活用品 3）避免外出。
  如有紧急情况请联系110。
  ```

#### 2. **emergency_flood** - 洪水预警  
- **变量**: village.name, river.name, flood.peakTime, danger.areas, shelter.locations
- **渠道**: SMS, Push, Email

### 📢 **村务公告类 (announcement)**

#### 3. **announcement_meeting** - 村民大会通知
- **变量**: village.name, meeting.date, meeting.time, meeting.location, meeting.agenda
- **渠道**: SMS, Push
- **条件逻辑**: 支持紧急会议特殊格式
- **示例**:
  ```
  📢【村务通知】和谐村村民：定于2024年3月15日晚上7点在村委会召开村民大会。
  议题：讨论春节活动安排。请各户派代表准时参加，共同商讨村务发展。
  ```

### 🌱 **农事提醒类 (agriculture)**

#### 4. **agriculture_planting** - 播种提醒
- **变量**: season, crop.name, planting.timeRange, planting.tips, technician.name, technician.phone
- **渠道**: SMS
- **方言支持**: 是

### ☁️ **天气预警类 (weather)**

#### 5. **weather_warning** - 天气预警
- **变量**: date, weather.condition, weather.temperature, weather.warning, weather.precautions
- **渠道**: SMS, Push
- **条件逻辑**: 支持严重天气特殊格式

### 🏥 **便民服务类 (service)**

#### 6. **service_medical** - 医疗服务通知
- **变量**: service.type, doctor.name, service.date, service.time, service.location, service.details, registration.method, contact.phone
- **渠道**: SMS, Push

## 🔧 **创建自定义模板**

### 基础模板结构
```javascript
const customTemplate = {
  name: '模板名称',              // 必需
  category: 'announcement',      // 必需：emergency, announcement, service, agriculture, weather, health, event, maintenance
  description: '模板描述',       // 可选
  content: '模板内容 {{变量名}}', // 必需
  priority: 'normal',           // 可选：urgent, high, normal, low
  channels: ['sms', 'push'],    // 可选：sms, email, push, broadcast
  variables: ['变量名'],         // 可选：用于文档
  dialectSupport: true,         // 可选：是否支持方言转换
  formatting: {                // 可选：格式化选项
    emoji: '🎉',
    prefix: '【通知】',
    maxLength: 200
  },
  tags: ['标签1', '标签2']      // 可选：用于分类
};

// 注册模板
const result = NotificationsService.registerTemplate('template_id', customTemplate);
```

### 高级功能：条件逻辑
```javascript
const conditionalTemplate = {
  name: '条件模板示例',
  category: 'announcement',
  content: '默认内容：{{message}}',
  conditions: [
    {
      if: { field: 'urgent', operator: 'equals', value: true },
      content: '紧急通知：{{message}} - 请立即查看！'
    },
    {
      if: { field: 'type', operator: 'equals', value: 'meeting' },
      content: '会议通知：{{message}} - 请准时参加'
    }
  ]
};
```

## 📱 **发送方式**

### 1. **单个发送**
```javascript
const result = await NotificationsService.sendWithTemplate(
  'template_id',
  templateData,
  {
    phone: '13800138000',
    email: 'user@example.com',
    deviceToken: 'token123',
    dialect: '四川话'  // 可选
  }
);
```

### 2. **批量发送**
```javascript
const batchResult = await NotificationsService.sendBatchWithTemplate(
  'template_id',
  commonData,  // 所有接收人共享的数据
  [
    {
      id: 'user1',
      contact: { phone: '13800138001' },
      data: { user: { name: '张三' } },    // 个人数据
      dialect: '普通话'
    },
    {
      id: 'user2', 
      contact: { phone: '13800138002' },
      data: { user: { name: '李四' } },
      dialect: '四川话'
    }
  ]
);
```

## 🗣️ **方言转换**

### 支持的方言
- **四川话**: 你好→你好哇, 谢谢→谢谢嘛, 注意→要得注意
- **粤语**: 谢谢→多谢, 注意→小心

### 使用方言
```javascript
const preview = NotificationsService.previewTemplate(
  'template_id', 
  data, 
  { dialect: '四川话' }
);
```

## 🔍 **条件操作符**

- `equals`: 等于
- `not_equals`: 不等于  
- `greater_than`: 大于
- `less_than`: 小于
- `contains`: 包含
- `in`: 在数组中

### 条件示例
```javascript
{
  if: { field: 'weather.severity', operator: 'equals', value: 'severe' },
  content: '严重天气预警内容'
}
```

## 🎨 **格式化选项**

```javascript
formatting: {
  emoji: '🌟',           // 前缀表情
  prefix: '【重要】',     // 前缀文本
  suffix: '- 村委会',     // 后缀文本
  maxLength: 200         // 最大长度限制
}
```

## 🧪 **测试和预览**

### 运行测试
```bash
run-template-tests.bat
```

### 查看演示
```bash
node examples/templateDemo.js
```

## 📊 **模板管理**

### 模板查询
```javascript
// 获取单个模板
const template = NotificationsService.getTemplate('template_id');

// 获取所有模板
const allTemplates = NotificationsService.getAllTemplates();

// 按类别获取
const emergencyTemplates = NotificationsService.getTemplatesByCategory('emergency');
```

### 模板删除
```javascript
const result = NotificationsService.deleteTemplate('template_id');
```

## 💡 **最佳实践**

### 1. **变量命名**
- 使用有意义的嵌套结构：`user.name`, `meeting.location`
- 保持一致性：所有时间相关用 `time`, `date`

### 2. **内容编写**
- 简洁明了，重要信息前置
- 使用表情符号增强识别度
- 考虑不同方言地区的表达习惯

### 3. **渠道选择**
- **紧急通知**: SMS + Push + 广播
- **日常公告**: SMS + Push  
- **详细信息**: Email
- **即时提醒**: Push

### 4. **条件逻辑**
- 优先级从高到低排列条件
- 保持条件简单明确
- 始终提供默认内容

### 5. **批量发送**
- 合理分批，避免系统过载
- 个性化数据和公共数据分离
- 考虑不同用户的方言偏好

## 🔧 **错误处理**

### 常见错误
1. **模板不存在**: 检查模板ID是否正确
2. **变量缺失**: 检查必需变量是否提供
3. **渠道错误**: 确认接收人有相应的联系方式
4. **条件错误**: 检查条件字段和操作符

### 调试技巧
```javascript
// 预览模板帮助调试
const preview = NotificationsService.previewTemplate('template_id', data);
if (!preview.success) {
  console.error('模板错误:', preview.error);
}
```

## 📈 **性能优化**

1. **批量发送**: 使用批量接口而非循环单发
2. **模板缓存**: 预定义模板会自动缓存
3. **数据准备**: 提前准备好所有变量数据
4. **渠道选择**: 根据紧急程度选择合适渠道

---

## 🎉 **总结**

消息模板系统为智慧乡村提供了强大的通知能力：

- ✅ **6个预定义模板**覆盖常见场景
- ✅ **灵活的变量替换**支持复杂数据结构
- ✅ **条件逻辑**实现智能内容选择
- ✅ **方言转换**适配不同地区
- ✅ **多渠道支持**确保信息到达
- ✅ **批量处理**提升运营效率

通过模板系统，村务工作者可以快速、准确、个性化地向村民发送各类通知，大幅提升智慧乡村的信息化服务水平！