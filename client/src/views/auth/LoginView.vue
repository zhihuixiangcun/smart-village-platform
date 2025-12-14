<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">🏘️</div>
        <h1>智慧村庄管理系统</h1>
        <p>请输入您的账号信息登录</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="loginForm.username"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="loginForm.remember" type="checkbox" />
            <span>记住我</span>
          </label>
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div class="login-options">
          <a href="#" class="forgot-password">忘记密码？</a>
          <span class="divider">|</span>
          <a href="#" class="register-link">注册新账户</a>
        </div>
      </form>

      <div class="user-types">
        <h3>用户类型：</h3>
        <div class="type-buttons">
          <button @click="setUserType('resident')" :class="{ active: userType === 'resident' }">
            👨‍👩‍👧‍👦 村民
          </button>
          <button @click="setUserType('committee')" :class="{ active: userType === 'committee' }">
            🏛️ 村委会
          </button>
          <button @click="setUserType('admin')" :class="{ active: userType === 'admin' }">
            ⚙️ 管理员
          </button>
        </div>
      </div>
    </div>

    <div class="system-info">
      <p>✅ 系统运行正常</p>
      <p>🔒 数据安全保护</p>
      <p>🌐 多语言支持</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const userType = ref('resident')

const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

const setUserType = (type) => {
  userType.value = type
}

const handleLogin = async () => {
  loading.value = true
  
  try {
    // 模拟登录请求
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('登录信息:', {
      ...loginForm,
      userType: userType.value
    })
    
    // 登录成功后跳转到仪表板
    router.push('/')
  } catch (error) {
    console.error('登录失败:', error)
    alert('登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  font-size: 4em;
  margin-bottom: 10px;
}

.login-header h1 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 1.8em;
}

.login-header p {
  color: #666;
  margin: 0;
}

.login-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 8px;
}

.login-btn {
  width: 100%;
  background: #4CAF50;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-bottom: 20px;
}

.login-btn:hover:not(:disabled) {
  background: #45a049;
}

.login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-options {
  text-align: center;
  color: #666;
}

.login-options a {
  color: #667eea;
  text-decoration: none;
}

.login-options a:hover {
  text-decoration: underline;
}

.divider {
  margin: 0 10px;
}

.user-types {
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.user-types h3 {
  text-align: center;
  color: #333;
  margin: 0 0 15px 0;
  font-size: 14px;
}

.type-buttons {
  display: flex;
  gap: 10px;
}

.type-buttons button {
  flex: 1;
  padding: 10px 8px;
  border: 2px solid #e1e5e9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.type-buttons button:hover {
  border-color: #667eea;
}

.type-buttons button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.system-info {
  margin-top: 30px;
  text-align: center;
  color: white;
  opacity: 0.9;
}

.system-info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>