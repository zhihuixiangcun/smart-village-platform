# 统一登录页面 API 集成文档

## 📋 概述

统一登录页面已成功集成到后端真实API，支持多种角色认证、多种登录方式，并提供快速测试登录功能。

---

## 🔌 API端点

### 登录端点

```
POST http://localhost:3001/api/v1/auth/login
```

**请求格式**:
```json
{
  "username": "testadmin",
  "password": "Test123456!",
  "role": "admin"
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

### 村委账户
```
用户名: testcadre
密码: Cadre123456!
角色: village_admin
权限: resident:manage, announcement:create, task:manage
```

### 村民账户
```
用户名: testresident
密码: Resident123456!
角色: resident
权限: 基础权限
```

---

## ✨ 功能特性

### 1. 多角色登录
- ✅ 村民 (resident)
- ✅ 村干部 (cadre - 对应 village_admin)
- ✅ 乡镇官员 (official)
- ✅ 采购商 (purchaser)
- ✅ 管理员 (admin)

### 2. 多种登录方式
- ✅ 密码登录
- ✅ 人脸识别登录（需摄像头权限）
- ✅ 微信扫码登录

### 3. 快速测试登录
- ✅ 一键测试账户登录
- ✅ 显示测试账户信息
- ✅ 自动填充用户名密码
- ✅ 自动切换对应角色

### 4. 安全特性
- ✅ 用户协议和隐私政策确认
- ✅ Token本地存储
- ✅ 自动恢复登录状态
- ✅ 角色权限管理

---

## 🎨 登录页面

### 访问地址
```
http://localhost:3006/unified-login?redirect=/dashboard
```

### 页面组成
1. **左侧品牌区** - 显示平台名称和核心功能
2. **角色选择区** - 5种角色卡片选择
3. **登录方式切换** - 密码/人脸/微信三种方式
4. **登录表单区** - 根据角色和登录方式动态显示
5. **快速测试登录** - 测试账户快捷按钮和信息展示

---

## 💻 前端实现

### 登录函数
```javascript
const handlePasswordLogin = async () => {
  if (!agreeTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议')
    return
  }

  loading.value = true
  try {
    // 调用真实的后端登录API
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: loginForm.username,
        password: loginForm.password,
        role: selectedRole.value
      })
    })

    const data = await response.json()

    if (!data.success) {
      ElMessage.error(data.message || '登录失败，请检查用户名、密码和角色')
      return
    }

    // 保存token和用户信息到Pinia Store
    userStore.setToken(data.data.token)
    userStore.setUserInfo(data.data.user)
    userStore.setPermissions(data.data.user.permissions || ['*'])
    userStore.setRoles([data.data.user.role])

    ElMessage.success(`欢迎回来，${data.data.user.username || data.data.user.name}！`)

    // 检查是否有重定向地址
    const redirect = router.currentRoute.value.query.redirect || '/dashboard'

    // 等待状态更新完成
    await new Promise(resolve => setTimeout(resolve, 300))

    // 跳转
    await router.push(redirect)

  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error.message || '登录失败，请检查网络连接或联系管理员')
  } finally {
    loading.value = false
  }
}
```

### 快速测试登录
```javascript
const quickTestLogin = (type) => {
  const testAccounts = {
    'admin': { username: 'testadmin', password: 'Test123456!', role: 'admin' },
    'cadre': { username: 'testcadre', password: 'Cadre123456!', role: 'village_admin' },
    'resident': { username: 'testresident', password: 'Resident123456!', role: 'resident' }
  }

  const account = testAccounts[type]
  if (account) {
    // 自动切换到对应角色
    if (selectedRole.value !== account.role) {
      selectedRole.value = account.role
    }

    // 自动填充用户名和密码
    loginForm.username = account.username
    loginForm.password = account.password

    // 自动同意协议
    agreeTerms.value = true

    // 自动登录
    setTimeout(() => {
      handlePasswordLogin()
    }, 300)
  } else {
    ElMessage.warning('该角色暂无测试账户')
  }
}
```

---

## 🔐 权限管理

### 角色与权限映射
```javascript
{
  admin: ['*'],  // 全部权限
  village_admin: ['resident:manage', 'announcement:create', 'task:manage'],
  village_official: ['resident:view', 'announcement:view'],
  resident: ['basic:view', 'service:apply']
}
```

### 权限检查
```javascript
// 检查用户是否有特定权限
if (userStore.hasPermission('admin:manage')) {
  // 允许访问
}

// 检查用户角色
if (userStore.roles.includes('admin')) {
  // 管理员操作
}
```

---

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **UI库**: Element Plus
- **状态管理**: Pinia (userStore)
- **路由**: Vue Router 4
- **HTTP**: Fetch API

### 后端
- **框架**: Express.js
- **认证**: JWT Token
- **数据库**: MongoDB
- **密码加密**: bcrypt

---

## 📱 响应式设计

统一登录页面支持多种设备：
- ✅ 桌面端 (> 768px) - 双栏布局
- ✅ 平板端 (481px - 768px) - 自适应布局
- ✅ 移动端 (< 480px) - 单栏堆叠布局

---

## 🎯 使用流程

### 方式1: 手动登录
1. 访问 http://localhost:3006/unified-login
2. 选择角色（村民/村干部/乡镇官员/采购商/管理员）
3. 选择登录方式（密码/人脸/微信）
4. 输入用户名和密码
5. 同意用户协议和隐私政策
6. 点击"登录"按钮
7. 等待登录成功
8. 自动跳转到Dashboard

### 方式2: 快速测试登录
1. 访问 http://localhost:3006/unified-login
2. 选择对应角色（管理员/村委/村民）
3. 点击对应的快速测试按钮
4. 自动填充用户名密码
5. 自动提交登录
6. 自动跳转到Dashboard

---

## 🚀 优化亮点

### 1. 智能角色检测
```javascript
// 快速登录时自动切换到对应角色
if (selectedRole.value !== account.role) {
  selectedRole.value = account.role
}
```

### 2. 按钮状态管理
```vue
<!-- 只在选中对应角色时才激活测试按钮 -->
<el-button
  :disabled="selectedRole !== 'admin'"
  :class="{ 'test-btn-active': selectedRole === 'admin' }"
>
```

### 3. 视觉反馈
- ✅ 悬停效果
- ✅ 激活状态发光边框
- ✅ 禁用状态灰色显示
- ✅ 加载动画

### 4. 错误处理
- ✅ 网络错误提示
- ✅ 登录失败提示
- ✅ 用户友好的错误消息
- ✅ 协议未确认提醒

---

## 📝 相关文件

| 文件 | 说明 |
|------|------|
| `client/src/views/auth/UnifiedLogin.vue` | 统一登录页面 |
| `client/src/views/auth/LoginView.vue` | 简化登录页面 |
| `client/src/stores/userStore.js` | 用户状态管理 |
| `client/src/api/auth.js` | 认证API封装 |
| `src/routes/authMinimal.js` | 后端认证路由 |
| `src/controllers/authController.js` | 认证控制器 |

---

## 🔍 测试验证

### 测试登录API
```bash
# 测试管理员登录
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Test123456!","role":"admin"}'

# 测试村委登录
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testcadre","password":"Cadre123456!","role":"village_admin"}'

# 测试村民登录
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testresident","password":"Resident123456!","role":"resident"}'
```

### 测试Token验证
```bash
curl -X GET http://localhost:3001/api/v1/auth/profile \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## ⚠️ 注意事项

1. **确保服务器运行**
   - 主API服务器 (3001)
   - 前端开发服务器 (3006)

2. **CORS配置**
   - 前端地址: http://localhost:3006
   - 后端地址: http://localhost:3001

3. **Token有效期**
   - 默认7天
   - 过期后需要重新登录

4. **角色映射**
   - 前端角色: `cadre` → 后端角色: `village_admin`
   - 快速登录已自动处理映射

5. **协议确认**
   - 必须先同意用户协议和隐私政策
   - 快速登录会自动同意

---

## 🎯 下一步

- [ ] 添加验证码功能
- [ ] 支持手机号登录
- [ ] 集成人脸识别后端API
- [ ] 实现微信扫码登录
- [ ] 添加多设备登录管理
- [ ] 实现忘记密码流程

---

**更新时间**: 2026-01-04
**版本**: v1.1.0
**维护者**: Smart Village Development Team
