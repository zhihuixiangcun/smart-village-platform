<template>
  <div class="auth-view">
    <div class="auth-container">
      <el-card class="auth-card" shadow="always">
        <div class="auth-header">
          <h1>用户登录</h1>
          <p>智慧村庄综合服务平台</p>
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
            <el-divider>快速登录</el-divider>
            <div class="quick-accounts">
              <el-button
                type="success"
                size="small"
                @click="quickLogin('admin')"
              >
                管理员登录
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="quickLogin('villager')"
              >
                村民登录
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 表单引用
const loginFormRef = ref()

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
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

    // 模拟登录API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 预定义的账号验证
    const accounts = {
      'admin': { password: 'admin123', name: '系统管理员', role: 'admin' },
      'test_villager': { password: '123456', name: '测试村民', role: 'villager' },
      '凤凰村_01': { password: '123456', name: '凤凰村民', role: 'villager' },
      '绿水村_01': { password: '123456', name: '绿水村民', role: 'villager' }
    }

    const account = accounts[loginForm.username]

    if (!account || account.password !== loginForm.password) {
      ElMessage.error('用户名或密码错误')
      return
    }

    // 设置用户信息
    const userInfo = {
      id: loginForm.username,
      username: loginForm.username,
      name: account.name,
      role: account.role,
      avatar: '',
      email: `${loginForm.username}@smartvillage.com`
    }

    // 保存token和用户信息
    userStore.setToken('demo-token-' + Date.now())
    userStore.setUserInfo(userInfo)
    userStore.setPermissions(['*']) // 临时给予所有权限
    userStore.setRoles([account.role])

    ElMessage.success(`欢迎回来，${account.name}！`)

    // 跳转到目标页面
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)

  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

// 快速登录
const quickLogin = (type) => {
  const quickAccounts = {
    'admin': { username: 'admin', password: 'admin123' },
    'villager': { username: 'test_villager', password: '123456' }
  }

  const account = quickAccounts[type]
  if (account) {
    loginForm.username = account.username
    loginForm.password = account.password
    loginForm.remember = true

    // 自动登录
    setTimeout(() => {
      handleLogin()
    }, 500)
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