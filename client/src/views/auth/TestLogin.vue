<template>
  <div class="test-login">
    <h2>智慧村务系统 - 测试登录</h2>
    <div class="login-form">
      <div class="form-group">
        <label>用户名:</label>
        <input v-model="username" type="text" placeholder="请输入用户名" />
      </div>
      <div class="form-group">
        <label>密码:</label>
        <input v-model="password" type="password" placeholder="请输入密码" />
      </div>
      <div class="form-group">
        <label>角色:</label>
        <select v-model="role">
          <option value="village_head">村长</option>
          <option value="village_director">村主任</option>
          <option value="accountant">会计</option>
          <option value="staff">工作人员</option>
        </select>
      </div>
      <button @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <button @click="handleRegister">注册新用户</button>
    </div>
    <div class="test-info">
      <h3>测试信息:</h3>
      <p>• 前端地址: http://localhost:3007</p>
      <p>• API服务器: 需要启动 (端口3001)</p>
      <p>• Socket服务器: 已运行 (端口5000)</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const username = ref('admin')
const password = ref('123456')
const role = ref('village_head')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true

  try {
    // 模拟登录请求
    console.log('登录信息:', { username: username.value, password: password.value, role: role.value })

    // 临时模拟登录成功
    const token = 'mock-token-' + Date.now()
    const userInfo = {
      id: '1',
      username: username.value,
      role: role.value,
      name: username.value,
      avatar: '',
      permissions: ['village:read', 'village:document', 'village:duty'],
      roles: [role.value]
    }

    // 使用 userStore 设置认证信息
    userStore.setToken(token)
    userStore.setUserInfo(userInfo)
    userStore.setPermissions(userInfo.permissions)
    userStore.setRoles(userInfo.roles)

    // 也设置到 localStorage 以确保兼容性
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(userInfo))

    console.log('用户信息已设置:', { token: token, userInfo: userInfo })
    console.log('userStore.isLoggedIn:', userStore.isLoggedIn)

    alert('登录成功！(模拟)')
    router.push('/village/home')

  } catch (error) {
    console.error('登录失败:', error)
    alert('登录失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  loading.value = true
  try {
    // 模拟注册请求
    console.log('注册信息:', { username: username.value, password: password.value, role: role.value })

    // 临时模拟注册成功并自动登录
    const token = 'mock-token-' + Date.now()
    const userInfo = {
      id: '1',
      username: username.value,
      role: role.value,
      name: username.value,
      avatar: '',
      permissions: ['village:read', 'village:document', 'village:duty'],
      roles: [role.value]
    }

    // 使用 userStore 设置认证信息
    userStore.setToken(token)
    userStore.setUserInfo(userInfo)
    userStore.setPermissions(userInfo.permissions)
    userStore.setRoles(userInfo.roles)

    // 也设置到 localStorage 以确保兼容性
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(userInfo))

    console.log('注册用户信息已设置:', { token: token, userInfo: userInfo })
    console.log('userStore.isLoggedIn:', userStore.isLoggedIn)

    alert('注册成功！(模拟)')
    router.push('/village/home')

  } catch (error) {
    console.error('注册失败:', error)
    alert('注册失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.test-login {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  text-align: center;
}

.login-form {
  margin: 20px 0;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

button:first-of-type {
  background-color: #007bff;
  color: white;
}

button:last-of-type {
  background-color: #28a745;
  color: white;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.test-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  text-align: left;
}

.test-info h3 {
  margin-top: 0;
  color: #333;
}

.test-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}
</style>