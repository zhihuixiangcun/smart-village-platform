# 系统设置功能文档

## 功能概述

系统设置功能为管理员提供完整的系统配置管理能力，包括基本设置、系统配置、通知设置、安全设置和数据管理等功能模块。

## 功能特性

### 1. 基本设置
- **村名称**：设置村庄的显示名称
- **所属乡镇**：设置村庄所属的乡镇
- **村编码**：设置村庄的唯一编码
- **联系人**：设置村庄联系人姓名
- **联系电话**：设置村庄联系电话

### 2. 系统配置
- **系统语言**：支持简体中文、英文
- **时区设置**：支持中国标准时间、香港时间、日本时间等
- **维护模式**：开启/关闭系统维护模式

### 3. 通知设置
- **站内消息通知**：开启/关闭站内消息推送
- **短信通知**：开启/关闭短信通知
- **邮件通知**：开启/关闭邮件通知
- **微信推送**：开启/关闭微信推送

### 4. 安全设置
- **会话超时**：设置用户会话超时时间（5-1440分钟）
- **密码最小长度**：设置用户密码最小长度（6-32位）
- **需要双重认证**：开启/关闭双重身份验证
- **最大登录尝试次数**：设置最大登录尝试次数（3-10次）

### 5. 数据管理
- **自动备份数据**：开启/关闭自动数据备份功能
- **数据保留期限**：设置数据保留期限（30-3650天）
- **数据操作**：数据备份、恢复、清理

## 技术架构

### 后端实现

#### 模型层 (SystemSetting.js)

```javascript
const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxlength: 100 },
  category: {
    type: String,
    required: true,
    enum: ['basic', 'notification', 'security', 'data', 'system'],
    default: 'system'
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  options: [{ label: String, value: mongoose.Schema.Types.Mixed }],
  isSensitive: { type: Boolean, default: false },
  editable: { type: Boolean, default: true },
  requiresRestart: { type: Boolean, default: false },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  validation: {
    required: { type: Boolean, default: true },
    type: { type: String },
    min: Number,
    max: Number,
    pattern: String
  },
  history: [{
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });
```

**特性**：
- 支持多种数据类型（字符串、数字、布尔值、对象、数组）
- 分类管理（基本、通知、安全、数据、系统）
- 历史记录追踪（最多保留20条）
- 租户隔离（按村庄ID隔离设置）
- 敏感设置标记
- 验证规则支持

#### 控制器层 (systemSettingsController.js)

```javascript
class SystemSettingsController {
  // 获取所有系统设置（支持按分类筛选）
  static async getAllSettings(req, res)

  // 获取单个设置
  static async getSettingByKey(req, res)

  // 创建新设置
  static async createSetting(req, res)

  // 更新设置
  static async updateSetting(req, res)

  // 批量更新设置（最多50条）
  static async batchUpdateSettings(req, res)

  // 重置设置为默认值
  static async resetSettings(req, res)

  // 获取设置修改历史
  static async getSettingHistory(req, res)

  // 删除设置
  static async deleteSetting(req, res)
}
```

**特性**：
- 完整的CRUD操作
- 批量更新支持
- 历史记录查询
- 审计日志记录（所有敏感操作）
- 统一的错误处理

#### 路由层 (systemSettingsRoutes.js)

```javascript
// 系统设置查询路由
GET    /api/v1/system-settings       - 获取所有设置
GET    /api/v1/system-settings/:key  - 获取单个设置
GET    /api/v1/system-settings/:key/history - 获取设置历史

// 系统设置管理路由（需要system:config权限）
POST   /api/v1/system-settings       - 创建新设置
PUT    /api/v1/system-settings/:key  - 更新设置
POST   /api/v1/system-settings/batch - 批量更新设置
POST   /api/v1/system-settings/reset - 重置为默认值
DELETE /api/v1/system-settings/:key - 删除设置
```

**权限控制**：
- 查询：`settings:read` 权限
- 创建/更新/删除：`system:config` 权限
- 审计日志：所有修改操作自动记录

### 前端实现

#### 移动端页面 (client-mobile/src/pages/home/system-settings.vue)

**页面结构**：
- 顶部导航栏（返回按钮 + 标题）
- 基本设置区块
- 系统配置区块
- 通知设置区块
- 安全设置区块
- 数据管理区块
- 底部保存/重置按钮

**UI组件**：
- 输入框：文本、数字、电话
- 选择器：语言、时区
- 开关：二进制设置
- 按钮：操作按钮

**响应式设计**：
- 适老化优化（大字模式支持）
- 骨架加载动画
- 移动端友好的触摸交互
- 触摸反馈（缩放动画）

**功能实现**：
```javascript
// 加载设置
const loadSettings = async () => {
  const response = await api.systemSettings.getAll();
  if (response.success && response.data) {
    Object.keys(settings).forEach(key => {
      if (response.data[key]) {
        Object.assign(settings[key], response.data[key]);
      }
    });
  }
};

// 保存设置（批量更新）
const handleSave = async () => {
  saving.value = true;
  try {
    const updates = [];

    Object.keys(settings).forEach(category => {
      const categorySettings = settings[category];
      Object.keys(categorySettings).forEach(key => {
        updates.push({
          key: `${category}.${key}`,
          value: categorySettings[key]
        });
      });
    });

    const response = await api.systemSettings.batchUpdate({ updates });

    if (response.success) {
      showToast('设置保存成功', 'success');
    }
  } catch (error) {
    showToast('保存失败，请重试', 'error');
  } finally {
    saving.value = false;
  }
};

// 恢复默认设置
const handleReset = async () => {
  const confirmed = await uni.showModal({
    title: '确认恢复默认设置',
    content: '确定要将所有设置恢复为默认值吗？此操作不可撤销。',
    confirmText: '确认恢复',
    cancelText: '取消'
  });

  if (confirmed.confirm) {
    const response = await api.systemSettings.reset();
    if (response.success) {
      showToast('已恢复默认设置', 'success');
      await loadSettings();
    }
  }
};
```

#### API集成 (client-mobile/src/api/index.js)

```javascript
export const systemSettings = {
  getAll: (params) => {
    return http.get('/system-settings', params);
  },

  getByKey: (key, params) => {
    return http.get(`/system-settings/${key}`, params);
  },

  batchUpdate: (data) => {
    return http.post('/system-settings/batch', data);
  },

  reset: (data) => {
    return http.post('/system-settings/reset', data);
  },

  getHistory: (key, params) => {
    return http.get(`/system-settings/${key}/history`, params);
  }
};
```

#### 路由配置 (client-mobile/src/pages.json)

```json
{
  "path": "pages/home/system-settings",
  "style": {
    "navigationBarTitleText": "系统设置"
  }
}
```

## 数据流图

```
用户打开系统设置页面
    ↓
加载现有设置（GET /api/v1/system-settings）
    ↓
用户修改设置
    ↓
点击保存按钮
    ↓
批量更新设置（POST /api/v1/system-settings/batch）
    ↓
后端验证、保存、记录审计日志
    ↓
返回保存结果
    ↓
显示成功/失败提示
```

## 安全性

### 权限控制
- 系统设置读取：`settings:read`
- 系统配置修改：`system:config`
- 敏感设置修改：需要额外确认
- 操作审计：所有修改操作记录到AuditLog

### 数据验证
- 前端：输入验证（必填、格式、范围）
- 后端：类型验证、范围验证、必填验证
- 防止SQL注入、XSS攻击

### 审计日志
- 记录操作人、操作时间、IP地址
- 记录修改前后的值
- 标记敏感操作
- 历史记录保留（最多20条）

## API接口文档

### 1. 获取所有设置

```
GET /api/v1/system-settings

Query Parameters:
  - category (optional): 设置分类
  - villageId (optional): 村庄ID

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "key": "basic.villageName",
      "category": "basic",
      "title": "村名称",
      "value": "智慧村庄",
      "valueType": "string",
      "description": "村庄的显示名称",
      "updatedAt": "2024-01-16T08:00:00.000Z"
    }
  ],
  "message": "获取系统设置成功"
}
```

### 2. 获取单个设置

```
GET /api/v1/system-settings/:key

Query Parameters:
  - villageId (optional): 村庄ID

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "key": "basic.villageName",
    "category": "basic",
    "title": "村名称",
    "value": "智慧村庄",
    "valueType": "string",
    "description": "村庄的显示名称",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  },
  "message": "获取设置成功"
}
```

### 3. 批量更新设置

```
POST /api/v1/system-settings/batch

Authorization: Bearer <token>
Permissions: system:config

Request Body:
{
  "updates": [
    {
      "key": "basic.villageName",
      "value": "新村庄名称"
    },
    {
      "key": "notification.email",
      "value": true
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 0,
    "errors": []
  },
  "message": "成功更新2条设置"
}
```

### 4. 重置为默认值

```
POST /api/v1/system-settings/reset

Authorization: Bearer <token>
Permissions: system:config

Request Body:
{
  "keys": ["basic.villageName", "notification.email"],
  "category": "notification"
}

Response:
{
  "success": true,
  "data": {
    "resetCount": 2
  },
  "message": "成功重置2条设置为默认值"
}
```

### 5. 获取设置历史

```
GET /api/v1/system-settings/:key/history

Query Parameters:
  - limit (optional): 返回历史记录数量，默认10
  - villageId (optional): 村庄ID

Response:
{
  "success": true,
  "data": [
    {
      "value": "新村庄名称",
      "updatedAt": "2024-01-16T08:00:00.000Z",
      "updatedBy": {
        "username": "admin",
        "name": "管理员"
      }
    }
  ],
  "message": "获取设置历史成功"
}
```

## 使用指南

### 管理员操作流程

1. **查看系统设置**
   - 打开移动端应用
   - 进入管理后台
   - 点击"系统设置"

2. **修改设置**
   - 选择要修改的设置分类
   - 修改相应的设置值
   - 点击"保存设置"按钮

3. **重置设置**
   - 点击"恢复默认"按钮
   - 确认重置操作
   - 系统自动恢复为默认值

4. **查看历史记录**
   - 点击某个设置的历史记录按钮
   - 查看该设置的修改历史

### 注意事项

1. **敏感操作**：修改系统配置需要`system:config`权限
2. **维护模式**：开启维护模式后，普通用户无法访问系统
3. **会话超时**：超时后需要重新登录
4. **密码策略**：密码长度需要符合安全要求
5. **批量更新**：一次最多更新50条设置
6. **历史记录**：每个设置最多保留20条历史记录

## 测试建议

### 功能测试

1. **基本设置**
   - 测试村名称保存和显示
   - 测试必填字段验证
   - 测试特殊字符处理

2. **通知设置**
   - 测试各通知渠道开关
   - 测试批量保存
   - 测试默认值恢复

3. **安全设置**
   - 测试会话超时设置
   - 测试密码策略验证
   - 测试双重认证开关
   - 测试登录尝试次数限制

4. **数据管理**
   - 测试自动备份开关
   - 测试数据保留期限
   - 测试备份/恢复/清理功能

### 性能测试

1. 测试大量设置数据的加载性能
2. 测试批量更新的响应时间
3. 测试并发操作的处理

### 安全测试

1. 测试权限验证（无权限用户无法访问）
2. 测试SQL注入防护
3. 测试XSS防护
4. 测试审计日志记录

## 扩展性建议

### 短期扩展

1. **更多设置项**：在现有分类下添加更多配置项
2. **自定义设置**：支持管理员添加自定义设置项
3. **设置导入导出**：支持配置文件的导入和导出
4. **设置模板**：预设常用的配置模板

### 长期扩展

1. **多租户支持**：完善租户隔离机制
2. **配置版本管理**：支持配置的版本控制
3. **配置审批流程**：重要的配置修改需要审批
4. **配置同步**：多个系统实例间的配置同步
5. **AI推荐配置**：基于使用数据智能推荐最优配置

## 维护建议

1. **定期审计**：定期检查系统设置的修改记录
2. **数据备份**：定期备份系统设置数据
3. **性能监控**：监控设置操作的响应时间
4. **权限审查**：定期审查具有系统配置权限的用户
5. **文档更新**：及时更新功能文档

## 常见问题

### Q1: 为什么修改设置后没有生效？

A: 某些设置标记为`requiresRestart: true`，需要重启后端服务才能生效。

### Q2: 如何恢复误删的设置？

A: 每个设置都有默认值存储在`defaultValue`字段，可以通过"恢复默认"功能一键恢复所有设置。

### Q3: 批量更新有次数限制吗？

A: 有，一次最多更新50条设置。如果需要更新更多，请分批操作。

### Q4: 设置历史记录会自动删除吗？

A: 是的，每个设置最多保留20条历史记录，超过的会自动删除最旧的记录。

## 更新日志

### v1.0.0 (2024-01-16)
- ✅ 创建后端数据模型
- ✅ 实现后端控制器
- ✅ 创建后端路由
- ✅ 创建移动端系统设置页面
- ✅ 更新移动端API模块
- ✅ 更新移动端路由配置
- ✅ 更新管理员首页入口
- ✅ 创建功能文档
