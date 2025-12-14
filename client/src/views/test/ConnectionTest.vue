<template>
  <div class="connection-test">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <h2>🔗 前后端连接测试</h2>
          <el-tag :type="serverStatus === 'online' ? 'success' : 'danger'">
            {{ serverStatus === 'online' ? '服务器在线' : '服务器离线' }}
          </el-tag>
        </div>
      </template>

      <!-- 连接状态 -->
      <el-row :gutter="20" class="status-row">
        <el-col :span="12">
          <el-statistic
            title="后端服务器"
            :value="serverStatus === 'online' ? '正常' : '异常'"
            :value-style="{ color: serverStatus === 'online' ? '#3f8600' : '#cf1322' }"
          />
        </el-col>
        <el-col :span="12">
          <el-statistic
            title="API响应时间"
            :value="responseTime"
            suffix="ms"
          />
        </el-col>
      </el-row>

      <el-divider />

      <!-- 测试按钮区域 -->
      <div class="test-section">
        <h3>基础连接测试</h3>
        <el-space wrap>
          <el-button type="primary" @click="testConnection" :loading="loading.connection">
            测试连接
          </el-button>
          <el-button type="success" @click="testHealth" :loading="loading.health">
            健康检查
          </el-button>
        </el-space>
      </div>

      <el-divider />

      <!-- 认证测试 -->
      <div class="test-section">
        <h3>认证系统测试</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form :model="loginForm" label-width="80px">
              <el-form-item label="用户名">
                <el-input v-model="loginForm.username" placeholder="请输入用户名" />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                />
              </el-form-item>
            </el-form>
          </el-col>
          <el-col :span="12">
            <el-space direction="vertical">
              <el-button type="primary" @click="testLogin" :loading="loading.login">
                登录测试
              </el-button>
              <el-button
                type="info"
                @click="testUserInfo"
                :loading="loading.userInfo"
                :disabled="!isLoggedIn"
              >
                获取用户信息
              </el-button>
              <el-button
                type="warning"
                @click="testLogout"
                :disabled="!isLoggedIn"
              >
                退出登录
              </el-button>
            </el-space>
          </el-col>
        </el-row>
      </div>

      <el-divider />

      <!-- API测试 -->
      <div class="test-section">
        <h3>业务API测试</h3>
        <el-space wrap>
          <el-button type="primary" @click="testResidentsAPI" :loading="loading.residents">
            获取村民列表
          </el-button>
          <el-button type="success" @click="testCommitteeAPI" :loading="loading.committee">
            获取村委信息
          </el-button>
          <el-button type="info" @click="testStoreIntegration" :loading="loading.store">
            测试Pinia Store
          </el-button>
        </el-space>
      </div>

      <el-divider />

      <!-- 结果显示 -->
      <div class="test-section">
        <h3>测试结果</h3>
        <el-card class="result-card" v-if="testResult">
          <div class="result-header">
            <el-tag :type="testResult.success ? 'success' : 'danger'">
              {{ testResult.success ? '成功' : '失败' }}
            </el-tag>
            <span class="result-title">{{ testResult.title }}</span>
          </div>
          <el-divider />
          <pre class="result-content">{{ JSON.stringify(testResult.data, null, 2) }}</pre>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { useResidentStore } from '@/stores/residentStore'
import { useCommitteeStore } from '@/stores/committeeStore'

// 状态管理
const userStore = useUserStore()
const residentStore = useResidentStore()
const committeeStore = useCommitteeStore()

// 响应式数据
const serverStatus = ref('checking')
const responseTime = ref(0)
const isLoggedIn = ref(false)
const testResult = ref(null)

// 表单数据
const loginForm = reactive({
  username: 'admin',
  password: 'admin123'
})

// 加载状态
const loading = reactive({
  connection: false,
  health: false,
  login: false,
  userInfo: false,
  residents: false,
  committee: false,
  store: false
})

// API基础地址
const API_BASE = 'http://localhost:3001'

// 组件挂载时检查服务器状态
onMounted(() => {
  checkServerStatus()
  // 检查是否已登录
  isLoggedIn.value = userStore.isLoggedIn
})

// 检查服务器状态
const checkServerStatus = async () => {
  try {
    const startTime = Date.now()
    const response = await fetch(`${API_BASE}/health`)
    const endTime = Date.now()

    if (response.ok) {
      serverStatus.value = 'online'
      responseTime.value = endTime - startTime
      ElMessage.success('服务器连接正常')
    } else {
      throw new Error('服务器响应异常')
    }
  } catch (error) {
    serverStatus.value = 'offline'
    responseTime.value = 0
    ElMessage.error('服务器连接失败')
  }
}

// 测试基础连接
const testConnection = async () => {
  loading.connection = true
  try {
    const response = await fetch(`${API_BASE}/api/test`)
    const data = await response.json()

    showTestResult('连接测试', data, true)
    ElNotification.success({
      title: '连接测试',
      message: '前后端连接正常'
    })
  } catch (error) {
    showTestResult('连接测试', { error: error.message }, false)
    ElNotification.error({
      title: '连接测试',
      message: '连接失败'
    })
  } finally {
    loading.connection = false
  }
}

// 测试健康检查
const testHealth = async () => {
  loading.health = true
  try {
    const response = await fetch(`${API_BASE}/health`)
    const data = await response.json()

    showTestResult('健康检查', data, true)
  } catch (error) {
    showTestResult('健康检查', { error: error.message }, false)
  } finally {
    loading.health = false
  }
}

// 测试登录
const testLogin = async () => {
  loading.login = true
  try {
    // 使用userStore的登录方法
    await userStore.login(loginForm)

    isLoggedIn.value = true
    showTestResult('登录测试', {
      message: '登录成功',
      user: userStore.userInfo,
      token: userStore.token ? '已获取' : '未获取'
    }, true)

    ElMessage.success('登录成功')
  } catch (error) {
    showTestResult('登录测试', { error: error.message }, false)
    ElMessage.error('登录失败')
  } finally {
    loading.login = false
  }
}

// 测试获取用户信息
const testUserInfo = async () => {
  loading.userInfo = true
  try {
    await userStore.getUserInfo()

    showTestResult('用户信息', {
      userInfo: userStore.userInfo,
      permissions: userStore.permissions,
      roles: userStore.roles
    }, true)
  } catch (error) {
    showTestResult('用户信息', { error: error.message }, false)
  } finally {
    loading.userInfo = false
  }
}

// 测试退出登录
const testLogout = async () => {
  try {
    await userStore.logout()
    isLoggedIn.value = false
    showTestResult('退出登录', { message: '退出成功' }, true)
    ElMessage.success('退出登录成功')
  } catch (error) {
    ElMessage.error('退出登录失败')
  }
}

// 测试村民API
const testResidentsAPI = async () => {
  loading.residents = true
  try {
    await residentStore.getResidentList()

    showTestResult('村民列表', {
      count: residentStore.residentList.length,
      total: residentStore.pagination.total,
      data: residentStore.residentList
    }, true)
  } catch (error) {
    showTestResult('村民列表', { error: error.message }, false)
  } finally {
    loading.residents = false
  }
}

// 测试村委API
const testCommitteeAPI = async () => {
  loading.committee = true
  try {
    await committeeStore.getMemberList()

    showTestResult('村委信息', {
      count: committeeStore.memberList.length,
      total: committeeStore.pagination.total,
      data: committeeStore.memberList
    }, true)
  } catch (error) {
    showTestResult('村委信息', { error: error.message }, false)
  } finally {
    loading.committee = false
  }
}

// 测试Store集成
const testStoreIntegration = async () => {
  loading.store = true
  try {
    // 测试各个Store的状态
    const storeStatus = {
      userStore: {
        isLoggedIn: userStore.isLoggedIn,
        hasToken: !!userStore.token,
        userInfo: !!userStore.userInfo,
        permissions: userStore.permissions.length,
        roles: userStore.roles.length
      },
      residentStore: {
        hasData: residentStore.hasResidents,
        count: residentStore.residentList.length,
        loading: residentStore.loading
      },
      committeeStore: {
        hasData: committeeStore.hasMembers,
        count: committeeStore.memberList.length,
        loading: committeeStore.loading
      }
    }

    showTestResult('Store集成测试', storeStatus, true)
    ElMessage.success('Store状态正常')
  } catch (error) {
    showTestResult('Store集成测试', { error: error.message }, false)
  } finally {
    loading.store = false
  }
}

// 显示测试结果
const showTestResult = (title, data, success) => {
  testResult.value = {
    title,
    data,
    success,
    timestamp: new Date().toLocaleString()
  }
}
</script>

<style scoped>
.connection-test {
  padding: 20px;
}

.test-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-row {
  margin-bottom: 20px;
}

.test-section {
  margin: 20px 0;
}

.test-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.result-card {
  margin-top: 20px;
  background: #f8f9fa;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-title {
  font-weight: bold;
  font-size: 16px;
}

.result-content {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  font-size: 12px;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
}
</style>