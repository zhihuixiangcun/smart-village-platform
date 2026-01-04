<template>
  <div class="auth-view">
    <div class="auth-container">
      <el-card class="auth-card" shadow="always">
        <div class="auth-header">
          <h1>用户登录</h1>
          <p>智慧村庄综合服务平台</p>
          <!-- 代码版本标识 - 用于调试 -->
          <div style="font-size: 11px; color: #909399; margin-top: 8px;">
            代码版本: {{ CODE_VERSION }}
          </div>
        </div>
        <div class="auth-content">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            @submit.prevent="handleLogin"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                size="large"
                prefix-icon="User"
                clearable
              />
            </el-form-item>
            <el-form-item prop="role">
              <el-select
                v-model="loginForm.role"
                placeholder="请选择角色"
                size="large"
                style="width: 100%"
              >
                <el-option label="管理员" value="admin" />
                <el-option label="村委" value="village_admin" />
                <el-option label="村务官员" value="village_official" />
                <el-option label="村民" value="resident" />
              </el-select>
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="loginForm.remember">记住密码</el-checkbox>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                style="width: 100%"
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 快速登录 -->
          <div class="quick-login">
            <el-divider>快速登录 (测试账户)</el-divider>
            <div class="quick-accounts">
              <el-button
                type="success"
                size="small"
                @click="quickLogin('admin')"
              >
                管理员 (testadmin)
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="quickLogin('villager')"
              >
                村民 (testresident)
              </el-button>
            </div>
            <div class="test-accounts-info">
              <p style="font-size: 12px; color: #909399; margin-top: 10px;">
                管理员: testadmin / admin / Test123456!<br>
                村民: testresident / resident / Resident123456!
              </p>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 🔧 版本标识 - 用于验证新代码是否加载
const CODE_VERSION = '2025-12-30-v2' // 修复 token 恢复问题
console.log('🚀 LoginView.vue 已加载 - 版本:', CODE_VERSION, Date.now())

// 表单引用
const loginFormRef = ref()

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  role: 'admin',
  remember: false
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

// 加载状态
const loading = ref(false)

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    // 表单验证
    await loginFormRef.value.validate()

    loading.value = true

    // 调用真实登录API
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: loginForm.username,
        password: loginForm.password,
        role: loginForm.role
      })
    })

    const data = await response.json()

    if (!data.success) {
      ElMessage.error(data.message || '登录失败，请检查用户名和密码')
      return
    }

    // 保存token和用户信息
    userStore.setToken(data.data.token)
    userStore.setUserInfo(data.data.user)
    userStore.setPermissions(data.data.user.permissions || ['*'])
    userStore.setRoles([data.data.user.role])

    ElMessage.success(`欢迎回来，${data.data.user.name || data.data.user.username}！`)

    // 等待 Vue 响应式状态更新
    await nextTick()

    // 强制等待确保状态完全保存到 localStorage
    await new Promise(resolve => setTimeout(resolve, 300))

    // 跳转到目标页面
    const redirect = route.query.redirect || '/dashboard'
    await router.replace(redirect)

  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请检查网络连接或联系管理员')
  } finally {
    loading.value = false
  }
}

// 快速登录
const quickLogin = async (type) => {
  const quickAccounts = {
    'admin': { username: 'testadmin', password: 'Test123456!', role: 'admin' },
    'villager': { username: 'testresident', password: 'Resident123456!', role: 'resident' }
  }

  const account = quickAccounts[type]
  if (account) {
    loginForm.username = account.username
    loginForm.password = account.password
    loginForm.role = account.role
    loginForm.remember = true

    // 自动登录
    setTimeout(() => {
      handleLogin()
    }, 300)
  }
}
</script>

<style lang="scss" scoped>
.auth-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px 0 0;

  h1 {
    color: #303133;
    margin-bottom: 10px;
    font-size: 28px;
    font-weight: 600;
  }

  p {
    color: #909399;
    margin: 0;
    font-size: 14px;
  }
}

.auth-content {
  padding: 0 30px 30px;
}

.quick-login {
  margin-top: 20px;

  .quick-accounts {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .test-accounts-info {
    text-align: center;
    padding: 10px;
    background: #f5f7fa;
    border-radius: 8px;
    margin-top: 10px;
  }
}

// 响应式设计
@media (max-width: 480px) {
  .auth-view {
    padding: 10px;
  }

  .auth-container {
    max-width: 100%;
  }

  .auth-content {
    padding: 0 20px 20px;
  }

  .quick-accounts {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }
}

// 表单样式调整
:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.1);
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}
</style>