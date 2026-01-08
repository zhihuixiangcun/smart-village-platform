<template>
  <div class="household-qr-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-page-header @back="$router.go(-1)" title="返回">
        <template #content>
          <div class="header-content">
            <el-icon><Wallet /></el-icon>
            <span class="title">一户一码</span>
          </div>
        </template>
        <template #extra>
          <el-button type="primary" :icon="Wallet" @click="showMyQR">
            我的户码
          </el-button>
        </template>
      </el-page-header>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 我的户码卡片 -->
      <el-card v-if="myHousehold" class="household-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">我的户码</span>
            <el-tag type="primary" size="large">
              {{ myHousehold.memberCount || 1 }}人家庭
            </el-tag>
          </div>
        </template>

        <div class="household-info">
          <div class="info-item">
            <span class="label">户主姓名：</span>
            <span class="value">{{ myHousehold.householder }}</span>
          </div>
          <div class="info-item">
            <span class="label">户码编号：</span>
            <span class="value code-id">{{ myHousehold.codeId }}</span>
          </div>
          <div class="info-item">
            <span class="label">家庭地址：</span>
            <span class="value">{{ myHousehold.address }}</span>
          </div>
        </div>

        <div class="card-actions">
          <el-button type="primary" :icon="View" @click="showQRCode = true">
            查看二维码
          </el-button>
          <el-button :icon="Document" @click="showDetail = true">
            查看详情
          </el-button>
        </div>
      </el-card>

      <!-- 空状态 -->
      <el-card v-else class="empty-card" shadow="never">
        <el-empty description="暂无户码信息">
          <el-button type="primary" @click="loadMyHousehold">
            重新加载
          </el-button>
        </el-empty>
      </el-card>

      <!-- 功能菜单 -->
      <el-card class="function-card" shadow="hover">
        <template #header>
          <div class="card-title">功能菜单</div>
        </template>

        <el-row :gutter="16">
          <el-col :xs="12" :sm="8" :md="6" v-for="item in menuItems" :key="item.id">
            <div class="menu-item" @click="handleMenuClick(item)">
              <div class="menu-icon">
                <el-icon :size="32">
                  <component :is="item.icon" />
                </el-icon>
              </div>
              <div class="menu-text">{{ item.text }}</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 快捷操作 -->
      <el-card class="action-card" shadow="hover">
        <template #header>
          <div class="card-title">快捷操作</div>
        </template>

        <el-button type="primary" size="large" :icon="Plus" block @click="showAddMember = true">
          添加家庭成员
        </el-button>
      </el-card>
    </div>

    <!-- 二维码对话框 -->
    <el-dialog
      v-model="showQRCode"
      title="户码二维码"
      width="450px"
      center
      :close-on-click-modal="false"
    >
      <div class="qr-dialog-content">
        <div v-if="qrLoading" class="qr-loading">
          <el-icon class="is-loading" :size="50"><Loading /></el-icon>
          <p>正在生成二维码...</p>
        </div>

        <div v-else-if="qrImageUrl" class="qr-display">
          <div class="qr-image">
            <img :src="qrImageUrl" alt="户码二维码" />
          </div>
          <div class="qr-info">
            <p class="code-text">{{ myHousehold?.codeId }}</p>
            <p class="scan-tip">扫码查看家庭信息</p>
          </div>
        </div>

        <div v-else class="qr-error">
          <el-result icon="error" title="二维码生成失败" sub-title="请稍后重试">
            <template #extra>
              <el-button type="primary" @click="generateQRCode">重新生成</el-button>
            </template>
          </el-result>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showQRCode = false">关闭</el-button>
          <el-button type="primary" @click="downloadQR" :disabled="!qrImageUrl || qrLoading">
            <el-icon><Download /></el-icon>
            下载二维码
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 扫码对话框 -->
    <el-dialog
      v-model="showScanner"
      title="扫码查看户信息"
      width="500px"
      center
    >
      <el-form label-position="top">
        <el-form-item label="户码编号">
          <el-input
            v-model="scanCodeInput"
            placeholder="请输入或扫描户码"
            clearable
            size="large"
          >
            <template #append>
              <el-button :icon="Grid" @click="handleScan">
                扫码
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showScanner = false">取消</el-button>
        <el-button type="primary" @click="handleScan">确认</el-button>
      </template>
    </el-dialog>

    <!-- 家庭成员对话框 -->
    <el-dialog
      v-model="showMembers"
      title="家庭成员"
      width="600px"
      center
    >
      <div v-if="loadingMembers" class="loading-container">
        <el-icon class="is-loading" :size="40"><Loading /></el-icon>
        <p>加载中...</p>
      </div>

      <div v-else-if="!members.length" class="empty-container">
        <el-empty description="暂无成员" />
      </div>

      <el-table v-else :data="members" stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="relationship" label="关系" width="100" />
        <el-table-column prop="phone" label="联系电话" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button size="small" @click="viewMemberDetail(scope.row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="showMembers = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 添加成员对话框 -->
    <el-dialog
      v-model="showAddMember"
      title="添加家庭成员"
      width="500px"
      center
    >
      <el-form :model="newMember" label-width="100px" size="large">
        <el-form-item label="姓名" required>
          <el-input v-model="newMember.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="身份证号" required>
          <el-input v-model="newMember.idCard" placeholder="请输入身份证号" />
        </el-form-item>

        <el-form-item label="关系" required>
          <el-select v-model="newMember.relationship" placeholder="请选择关系">
            <el-option label="配偶" value="配偶" />
            <el-option label="子女" value="子女" />
            <el-option label="父母" value="父母" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <el-form-item label="联系电话">
          <el-input v-model="newMember.phone" placeholder="请输入电话" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddMember = false">取消</el-button>
        <el-button type="primary" @click="handleAddMember">确定</el-button>
      </template>
    </el-dialog>

    <!-- 更新信息对话框 -->
    <el-dialog
      v-model="showUpdateForm"
      title="更新信息"
      width="600px"
      center
    >
      <el-tabs v-model="updateTabActive">
        <el-tab-pane label="地址" name="address">
          <el-form :model="updateForm.address" label-width="100px">
            <el-form-item label="详细地址">
              <el-input
                v-model="updateForm.address.detailed"
                type="textarea"
                placeholder="请输入详细地址"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleUpdateAddress">
                更新地址
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="标签" name="tags">
          <el-form label-width="100px">
            <el-form-item label="家庭标签">
              <el-checkbox-group v-model="updateForm.tags">
                <el-checkbox label="党员家庭" />
                <el-checkbox label="军属家庭" />
                <el-checkbox label="文明家庭" />
                <el-checkbox label="安全家庭" />
              </el-checkbox-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleUpdateTags">
                更新标签
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="联系方式" name="contact">
          <el-form :model="updateForm.contact" label-width="100px">
            <el-form-item label="联系电话">
              <el-input
                v-model="updateForm.contact.phone"
                placeholder="请输入电话"
                type="tel"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleUpdateContact">
                更新联系方式
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="showUpdateForm = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 扫码结果对话框 -->
    <el-dialog
      v-model="showScanResult"
      title="户信息"
      width="500px"
      center
    >
      <el-descriptions v-if="scanResult" :column="1" border>
        <el-descriptions-item label="户主姓名">
          {{ scanResult.household?.householder?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="家庭人数">
          {{ scanResult.household?.memberCount }}人
        </el-descriptions-item>
        <el-descriptions-item label="家庭地址">
          {{ scanResult.household?.addressText }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag type="success">正常</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button type="primary" @click="showScanResult = false">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetail"
      title="家庭详细信息"
      width="700px"
      center
    >
      <div v-if="myHousehold">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="户码" :span="2">
            {{ myHousehold.codeId }}
          </el-descriptions-item>
          <el-descriptions-item label="户主姓名">
            {{ myHousehold.householder }}
          </el-descriptions-item>
          <el-descriptions-item label="家庭人数">
            {{ myHousehold.memberCount || 1 }}人
          </el-descriptions-item>
          <el-descriptions-item label="家庭地址" :span="2">
            {{ myHousehold.address }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDate(myHousehold.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Wallet,
  View,
  Document,
  Plus,
  Download,
  Loading,
  User,
  Edit,
  DataAnalysis,
  Refresh,
  List,
  Grid
} from '@element-plus/icons-vue'
import householdQRApi from '@/api/householdQR'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// ============ 响应式数据 ============
const myHousehold = ref(null)
const qrImageUrl = ref('')
const qrLoading = ref(false)
const loadingMembers = ref(false)
const members = ref([])
const scanResult = ref(null)

// 弹窗控制
const showQRCode = ref(false)
const showScanner = ref(false)
const showMembers = ref(false)
const showAddMember = ref(false)
const showUpdateForm = ref(false)
const showScanResult = ref(false)
const showDetail = ref(false)
const showHistory = ref(false)
const showStats = ref(false)

// 表单数据
const scanCodeInput = ref('')
const newMember = reactive({
  name: '',
  idCard: '',
  relationship: '',
  phone: ''
})
const updateForm = reactive({
  address: { detailed: '' },
  tags: [],
  contact: { phone: '' }
})
const updateTabActive = ref('address')

// 功能菜单
const menuItems = [
  { id: 'scan', text: '扫码查看', icon: Grid },
  { id: 'members', text: '家庭成员', icon: User },
  { id: 'update', text: '更新信息', icon: Edit },
  { id: 'history', text: '变更历史', icon: List },
  { id: 'stats', text: '统计信息', icon: DataAnalysis },
  { id: 'refresh', text: '刷新二维码', icon: Refresh }
]

// ============ 方法 ============

/**
 * 加载我的户码信息
 */
const loadMyHousehold = async () => {
  try {
    // 使用当前登录用户的ID来查找户码
    const userId = userStore.userInfo?.id
    if (!userId) {
      ElMessage.warning('用户信息不存在，请重新登录')
      return
    }

    console.log('[加载户码] 用户ID:', userId)

    const response = await householdQRApi.generateQR(userId, { includeImage: true })
    if (response.success) {
      myHousehold.value = {
        ...response.data.household,
        codeId: response.data.codeId,
        address: response.data.household.address,
        householder: response.data.household.householder,
        memberCount: response.data.household.memberCount
      }
      qrImageUrl.value = response.data.qrImageUrl
      console.log('[加载户码] 成功:', myHousehold.value)
    } else {
      console.error('[加载户码] 失败:', response.error)
      ElMessage.error(response.error || '加载户码失败')
    }
  } catch (error) {
    console.error('[加载户码] 异常:', error)
    ElMessage.error('加载失败，请稍后重试')
  }
}

/**
 * 显示我的二维码
 */
const showMyQR = () => {
  if (!myHousehold.value) {
    ElMessage.warning('请先加载户码信息')
    loadMyHousehold()
    return
  }
  showQRCode.value = true
}

/**
 * 生成二维码
 */
const generateQRCode = async () => {
  qrLoading.value = true
  try {
    const userId = userStore.userInfo?.id
    const response = await householdQRApi.generateQR(userId, { includeImage: true })

    if (response.success) {
      qrImageUrl.value = response.data.qrImageUrl
      ElMessage.success('二维码生成成功')
    }
  } catch (error) {
    ElMessage.error('生成失败')
  } finally {
    qrLoading.value = false
  }
}

/**
 * 下载二维码
 */
const downloadQR = () => {
  if (!qrImageUrl.value) {
    ElMessage.warning('请先生成二维码')
    return
  }

  try {
    const link = document.createElement('a')
    link.href = qrImageUrl.value
    link.download = `户码_${myHousehold.value?.codeId}.png`
    link.click()
    ElMessage.success('下载成功')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

/**
 * 处理扫码
 */
const handleScan = async () => {
  const codeId = scanCodeInput.value.trim()
  if (!codeId) {
    ElMessage.warning('请输入户码')
    return
  }

  try {
    const response = await householdQRApi.publicScanQR(codeId)
    if (response.success) {
      scanResult.value = response.data
      showScanResult.value = true
      showScanner.value = false
      scanCodeInput.value = ''
    }
  } catch (error) {
    ElMessage.error(error.message || '扫码失败')
  }
}

/**
 * 添加成员
 */
const handleAddMember = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    if (!codeId) {
      ElMessage.warning('户码不存在')
      return
    }

    const response = await householdQRApi.addMember(codeId, newMember)
    if (response.success) {
      ElMessage.success('添加成功')
      showAddMember.value = false
      // 重置表单
      Object.assign(newMember, {
        name: '',
        idCard: '',
        relationship: '',
        phone: ''
      })
      // 重新加载成员列表
      loadMembers()
    }
  } catch (error) {
    ElMessage.error(error.message || '添加失败')
  }
}

/**
 * 更新地址
 */
const handleUpdateAddress = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    const response = await householdQRApi.updateAddress(codeId, updateForm.address)
    if (response.success) {
      ElMessage.success('更新成功')
      showUpdateForm.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  }
}

/**
 * 更新标签
 */
const handleUpdateTags = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    const response = await householdQRApi.updateTags(codeId, updateForm.tags)
    if (response.success) {
      ElMessage.success('更新成功')
      showUpdateForm.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  }
}

/**
 * 更新联系方式
 */
const handleUpdateContact = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    const response = await householdQRApi.updateContact(codeId, updateForm.contact.phone)
    if (response.success) {
      ElMessage.success('更新成功')
      showUpdateForm.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  }
}

/**
 * 查看成员详情
 */
const viewMemberDetail = (member) => {
  ElMessageBox.alert(`
    姓名: ${member.name}
    关系: ${member.relationship}
    电话: ${member.phone || '未设置'}
    性别: ${member.gender || '未设置'}
  `, '成员详情')
}

/**
 * 加载成员列表
 */
const loadMembers = async () => {
  // TODO: 实现加载成员列表的逻辑
  members.value = []
}

/**
 * 菜单点击处理
 */
const handleMenuClick = (item) => {
  switch (item.id) {
    case 'scan':
      showScanner.value = true
      break
    case 'members':
      showMembers.value = true
      loadMembers()
      break
    case 'update':
      showUpdateForm.value = true
      break
    case 'history':
      ElMessage.info('变更历史功能开发中')
      break
    case 'stats':
      ElMessage.info('统计信息功能开发中')
      break
    case 'refresh':
      refreshQRCode()
      break
  }
}

/**
 * 刷新二维码
 */
const refreshQRCode = async () => {
  try {
    const userId = userStore.userInfo?.id
    if (!userId) {
      ElMessage.warning('用户信息不存在')
      return
    }

    ElMessage.info('正在刷新二维码...')
    const response = await householdQRApi.generateQR(userId, { includeImage: true })
    if (response.success) {
      qrImageUrl.value = response.data.qrData.qrImageUrl
      ElMessage.success('刷新成功')
    }
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return '未设置'
  return new Date(date).toLocaleDateString('zh-CN')
}

// ============ 生命周期 ============
onMounted(() => {
  loadMyHousehold()
})
</script>

<style scoped>
.household-qr-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.main-content {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.household-card,
.function-card,
.action-card,
.empty-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.household-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 20px 0;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
  min-width: 100px;
}

.info-item .value {
  color: #303133;
}

.info-item .value.code-id {
  font-family: monospace;
  color: #409eff;
  font-size: 16px;
  letter-spacing: 1px;
}

.card-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

/* 功能菜单 */
.menu-item {
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.menu-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
  transform: translateY(-2px);
}

.menu-icon {
  color: #409eff;
  margin-bottom: 8px;
}

.menu-text {
  font-size: 14px;
  color: #606266;
}

/* 二维码对话框 */
.qr-dialog-content {
  padding: 20px 0;
}

.qr-loading,
.qr-display,
.qr-error {
  text-align: center;
}

.qr-image img {
  width: 280px;
  height: 280px;
  margin: 0 auto 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
  background: white;
}

.qr-info .code-text {
  font-size: 20px;
  font-weight: 600;
  font-family: monospace;
  margin: 0 0 8px;
}

.qr-info .scan-tip {
  color: #909399;
  font-size: 14px;
}

.loading-container,
.empty-container {
  text-align: center;
  padding: 40px;
}

/* 响应式 */
@media (max-width: 768px) {
  .main-content {
    padding: 0 16px;
  }

  .card-actions {
    flex-direction: column;
  }

  .card-actions .el-button {
    width: 100%;
  }

  .qr-image img {
    width: 220px;
    height: 220px;
  }
}
</style>
