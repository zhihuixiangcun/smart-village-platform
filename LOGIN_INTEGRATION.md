# 登录集成说明

## 📋 概述

登录页面已成功集成到后端真实API，支持用户认证和权限管理。

---

## 🔌 API集成

### 登录端点

```
POST http://localhost:3001/api/v1/auth/login
```

**请求格式**:
```json
{
  "username": "testadmin",
  "password": "Test123456!"
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "用户ID",
      "username": "testadmin",
      "name": "管理员",
      "role": "admin",
      "permissions": ["*"],
      "avatar": "",
      "email": "testadmin@smartvillage.com"
    }
  },
  "message": "登录成功"
}
```

---

## 🧪 测试账户

### 管理员账户
```
用户名: testadmin
密码: Test123456!
角色: admin
权限: 全部权限
```

### 村民账户
```
用户名: testresident
密码: Resident123456!
角色: resident
权限: 基础权限
```

### 村委账户
```
用户名: testcadre
密码: Cadre123456!
角色: village_admin
权限: resident:manage, announcement:create, task:manage
```

### 村务官员账户
```
用户名: testofficial
密码: Official123456!
角色: village_official
权限: resident:view, announcement:view
```

---

## ✨ 功能特性

### 1. 用户登录
- ✅ 真实API集成
- ✅ Token认证
- ✅ 权限管理
- ✅ 角色区分

### 2. 快速登录
- ✅ 一键测试账户登录
- ✅ 显示测试账户信息
- ✅ 自动填充用户名密码

### 3. 记住密码
- ✅ 本地存储Token
- ✅ 自动恢复登录状态
- ✅ 安全的Token管理

### 4. 错误处理
- ✅ 网络错误提示
- ✅ 登录失败提示
- ✅ 用户友好的错误消息

---

## 🎨 登录页面

### 访问地址
```
http://localhost:3000/login
```

### 页面功能
1. **用户名输入框** - 输入用户名
2. **密码输入框** - 输入密码（支持显示/隐藏）
3. **记住密码** - 保存登录状态
4. **登录按钮** - 提交登录表单
5. **快速登录** - 测试账户一键登录

---

## 🔐 安全特性

### Token管理
```javascript
// Token存储在localStorage
localStorage.setItem('token', token)

// 请求时携带Token
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 权限控制
```javascript
// 用户权限存储
userStore.setPermissions(data.data.user.permissions)

// 权限检查
if (userStore.hasPermission('admin:manage')) {
  // 允许访问
}
```

---

## 📱 响应式设计

登录页面支持多种设备：
- ✅ 桌面端 (> 480px)
- ✅ 平板端 (480px - 768px)
- ✅ 移动端 (< 480px)

---

## 🚀 使用流程

### 方式1: 手动登录
1. 访问 http://localhost:3000/login
2. 输入用户名和密码
3. 点击"登录"按钮
4. 等待登录成功
5. 自动跳转到Dashboard

### 方式2: 快速登录
1. 访问 http://localhost:3000/login
2. 点击"管理员 (testadmin)"或"村民 (testresident)"按钮
3. 自动填充用户名密码
4. 自动提交登录
5. 自动跳转到Dashboard

---

## 🛠️ 技术实现

### 前端
```javascript
// 登录API调用
const response = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: loginForm.username,
    password: loginForm.password
  })
})

const data = await response.json()

// 保存登录状态
userStore.setToken(data.data.token)
userStore.setUserInfo(data.data.user)
userStore.setPermissions(data.data.user.permissions)
```

### 后端
```javascript
// 登录路由
router.post('/login', authController.login)

// JWT Token生成
const token = jwt.sign(
  { userId: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)
```

---

## 📝 相关文件

| 文件 | 说明 |
|------|------|
| `client/src/views/auth/LoginView.vue` | 登录页面 |
| `client/src/api/auth.js` | 认证API |
| `client/src/stores/userStore.js` | 用户状态管理 |
| `src/routes/authMinimal.js` | 后端认证路由 |
| `src/controllers/authController.js` | 认证控制器 |

---

## 🔍 测试验证

### 1. 测试登录API
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Test123456!"}'
```

### 2. 测试Token验证
```bash
curl -X GET http://localhost:3001/api/v1/auth/profile \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 3. 测试权限控制
```bash
curl -X GET http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## ⚠️ 注意事项

1. **确保服务器运行**
   - 主API服务器 (3001)
   - Socket.IO服务器 (5000)

2. **CORS配置**
   - 前端地址: http://localhost:3000
   - 后端地址: http://localhost:3001

3. **Token有效期**
   - 默认7天
   - 过期后需要重新登录

4. **密码安全**
   - 最小长度6位
   - 建议包含大小写字母、数字、特殊字符

---

## 🎯 下一步

- [ ] 添加验证码功能
- [ ] 支持手机号登录
- [ ] 集成人脸识别登录
- [ ] 添加记住密码功能
- [ ] 实现自动登录
- [ ] 添加多设备登录管理

---

**更新时间**: 2026-01-04
**版本**: v1.0.1
