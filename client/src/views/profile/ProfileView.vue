<template>
  <div class="profile-view">
    <div class="page-header">
      <h2>个人中心</h2>
      <p>管理您的个人信息和账户设置</p>
    </div>

    <el-row :gutter="20">
      <!-- 用户信息卡片 -->
      <el-col :span="8">
        <el-card class="profile-card">
          <div class="profile-header">
            <el-avatar :size="80" :src="userInfo.avatar">
              {{ userInfo.name?.[0] }}
            </el-avatar>
            <h3>{{ userInfo.name }}</h3>
            <p>{{ userInfo.role === 'admin' ? '系统管理员' : '普通用户' }}</p>
          </div>

          <el-divider />

          <div class="profile-stats">
            <div class="stat-item">
              <span class="label">用户名：</span>
              <span class="value">{{ userInfo.username }}</span>
            </div>
            <div class="stat-item">
              <span class="label">注册时间：</span>
              <span class="value">{{ formatDate(userInfo.createdAt) }}</span>
            </div>
            <div class="stat-item">
              <span class="label">最后登录：</span>
              <span class="value">{{ formatDate(userInfo.lastLoginAt) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 主要内容区域 -->
      <el-col :span="16">
        <el-tabs v-model="activeTab" class="profile-tabs">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-card>
              <el-form
                ref="basicFormRef"
                :model="basicForm"
                :rules="basicRules"
                label-width="100px"
              >
                <el-form-item label="真实姓名" prop="name">
                  <el-input v-model="basicForm.name" placeholder="请输入真实姓名" />
                </el-form-item>

                <el-form-item label="邮箱地址" prop="email">
                  <el-input v-model="basicForm.email" placeholder="请输入邮箱地址" />
                </el-form-item>

                <el-form-item label="手机号码" prop="phone">
                  <el-input v-model="basicForm.phone" placeholder="请输入手机号码" />
                </el-form-item>

                <el-form-item label="个人简介" prop="bio">
                  <el-input
                    v-model="basicForm.bio"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入个人简介"
                  />
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" :loading="saving" @click="saveBasicInfo">
                    保存修改
                  </el-button>
                  <el-button @click="resetBasicForm">重置</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>

          <!-- 安全设置 -->
          <el-tab-pane label="安全设置" name="security">
            <el-card>
              <el-form
                ref="passwordFormRef"
                :model="passwordForm"
                :rules="passwordRules"
                label-width="100px"
              >
                <el-form-item label="当前密码" prop="currentPassword">
                  <el-input
                    v-model="passwordForm.currentPassword"
                    type="password"
                    placeholder="请输入当前密码"
                    show-password
                  />
                </el-form-item>

                <el-form-item label="新密码" prop="newPassword">
                  <el-input
                    v-model="passwordForm.newPassword"
                    type="password"
                    placeholder="请输入新密码"
                    show-password
                  />
                </el-form-item>

                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                  />
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" :loading="changingPassword" @click="changePassword">
                    修改密码
                  </el-button>
                  <el-button @click="resetPasswordForm">重置</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>

          <!-- 操作日志 -->
          <el-tab-pane label="操作日志" name="logs">
            <el-card>
              <el-table :data="operationLogs" v-loading="logsLoading">
                <el-table-column prop="action" label="操作" width="150" />
                <el-table-column prop="resource" label="资源" width="150" />
                <el-table-column prop="ip" label="IP地址" width="120" />
                <el-table-column prop="userAgent" label="设备信息" min-width="200" />
                <el-table-column prop="createdAt" label="操作时间" width="160">
                  <template #default="scope">
                    {{ formatDate(scope.row.createdAt) }}
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination">
                <el-pagination
                  v-model:current-page="logsPagination.page"
                  v-model:page-size="logsPagination.pageSize"
                  :total="logsPagination.total"
                  layout="prev, pager, next"
                  @current-change="loadOperationLogs"
                />
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const activeTab = ref('basic')
const saving = ref(false)
const changingPassword = ref(false)
const logsLoading = ref(false)

const basicFormRef = ref(null)
const passwordFormRef = ref(null)

// 用户信息
const userInfo = computed(() => userStore.userInfo || {})

// 基本信息表单
const basicForm = reactive({
  name: '',
  email: '',
  phone: '',
  bio: ''
})

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 操作日志
const operationLogs = ref([])
const logsPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单验证规则
const basicRules = reactive({
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = reactive({
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 初始化表单数据
const initBasicForm = () => {
  if (userInfo.value) {
    basicForm.name = userInfo.value.name || ''
    basicForm.email = userInfo.value.email || ''
    basicForm.phone = userInfo.value.phone || ''
    basicForm.bio = userInfo.value.bio || ''
  }
}

// 保存基本信息
const saveBasicInfo = async () => {
  try {
    await basicFormRef.value.validate()
    saving.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('个人信息保存成功')
  } catch (error) {
    if (error !== false) {
      ElMessage.error('保存失败，请重试')
    }
  } finally {
    saving.value = false
  }
}

// 重置基本信息表单
const resetBasicForm = () => {
  initBasicForm()
}

// 修改密码
const changePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    changingPassword.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('密码修改成功')
    resetPasswordForm()
  } catch (error) {
    if (error !== false) {
      ElMessage.error('密码修改失败，请重试')
    }
  } finally {
    changingPassword.value = false
  }
}

// 重置密码表单
const resetPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordFormRef.value?.resetFields()
}

// 加载操作日志
const loadOperationLogs = async () => {
  logsLoading.value = true
  try {
    // 模拟数据
    const mockLogs = [
      {
        action: '登录系统',
        resource: '系统',
        ip: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        createdAt: '2024-01-15 10:30:00'
      },
      {
        action: '查看村民列表',
        resource: '村民管理',
        ip: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        createdAt: '2024-01-15 10:25:00'
      }
    ]

    await new Promise(resolve => setTimeout(resolve, 500))
    operationLogs.value = mockLogs
    logsPagination.total = mockLogs.length
  } catch (error) {
    ElMessage.error('加载操作日志失败')
  } finally {
    logsLoading.value = false
  }
}

onMounted(() => {
  initBasicForm()
  loadOperationLogs()
})
</script>

<style scoped>
.profile-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 5px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.profile-card {
  height: fit-content;
}

.profile-header {
  text-align: center;
}

.profile-header h3 {
  margin: 15px 0 5px 0;
  color: #303133;
}

.profile-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.profile-stats {
  padding: 0 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.stat-item .label {
  color: #606266;
}

.stat-item .value {
  color: #303133;
  font-weight: 500;
}

.profile-tabs {
  margin-top: 0;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>