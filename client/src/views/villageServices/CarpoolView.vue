<template>
  <div class="carpool-view">
    <div class="page-header">
      <h2>
        <el-icon><Van /></el-icon>
        乡村拼车
      </h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        发布拼车
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchCarpools">
            <el-option label="开放中" value="open" />
            <el-option label="已满员" value="full" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="出发地">
          <el-input v-model="filters.origin" placeholder="搜索出发地" clearable @change="fetchCarpools" />
        </el-form-item>
        <el-form-item label="目的地">
          <el-input v-model="filters.destination" placeholder="搜索目的地" clearable @change="fetchCarpools" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 拼车列表 -->
    <el-row :gutter="20" class="carpools-list">
      <el-col :span="12" v-for="carpool in carpools" :key="carpool._id">
        <el-card class="carpool-card">
          <div class="carpool-header">
            <div class="driver-info">
              <el-avatar :size="45" :src="carpool.creator?.avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="driver-details">
                <div class="driver-name">{{ carpool.creator?.name || '车主' }}</div>
                <div class="carpool-time">{{ formatDateTime(carpool.departureTime) }}</div>
              </div>
            </div>
            <el-tag :type="getStatusType(carpool.status)" size="small">
              {{ getStatusLabel(carpool.status) }}
            </el-tag>
          </div>

          <div class="carpool-route">
            <div class="route-point origin">
              <el-icon class="route-icon"><LocationFilled /></el-icon>
              <div class="point-info">
                <div class="point-label">出发地</div>
                <div class="point-value">{{ carpool.origin }}</div>
              </div>
            </div>
            <div class="route-line"></div>
            <div class="route-point destination">
              <el-icon class="route-icon"><LocationFilled /></el-icon>
              <div class="point-info">
                <div class="point-label">目的地</div>
                <div class="point-value">{{ carpool.destination }}</div>
              </div>
            </div>
          </div>

          <div class="carpool-info">
            <div class="info-item">
              <el-icon><User /></el-icon>
              <span>座位：{{ carpool.seats }}位</span>
            </div>
            <div class="info-item" v-if="carpool.cost">
              <el-icon><Money /></el-icon>
              <span>{{ carpool.cost }}元/人</span>
            </div>
            <div class="info-item">
              <el-icon><UserFilled /></el-icon>
              <span>已订：{{ carpool.passengers?.length || 0 }}/{{ carpool.seats }}</span>
            </div>
          </div>

          <div v-if="carpool.notes" class="carpool-notes">
            <el-text size="small" type="info">{{ carpool.notes }}</el-text>
          </div>

          <!-- 乘客列表 -->
          <div v-if="carpool.passengers?.length" class="passengers-list">
            <div class="passengers-label">乘客：</div>
            <el-avatar-group :max="5">
              <el-avatar
                v-for="p in carpool.passengers"
                :key="p.userId._id"
                :size="32"
                :src="p.userId.avatar"
              >
                {{ p.userId.name?.[0] || 'U' }}
              </el-avatar>
            </el-avatar-group>
          </div>

          <div class="carpool-actions">
            <el-button
              v-if="carpool.status === 'open' && !isMyCarpool(carpool) && !hasJoined(carpool)"
              type="primary"
              size="small"
              @click="joinCarpool(carpool)"
            >
              加入拼车
            </el-button>
            <el-button
              v-if="isMyCarpool(carpool)"
              type="danger"
              size="small"
              @click="cancelCarpool(carpool)"
            >
              取消拼车
            </el-button>
            <el-button
              v-if="hasJoined(carpool)"
              type="warning"
              size="small"
              @click="leaveCarpool(carpool)"
            >
              退出拼车
            </el-button>
            <el-button size="small" @click="viewDetail(carpool)">详情</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建拼车对话框 -->
    <el-dialog v-model="showCreateDialog" title="发布拼车" width="600px" @close="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="出发地" prop="origin">
          <el-input v-model="createForm.origin" placeholder="请输入出发地" />
        </el-form-item>
        <el-form-item label="目的地" prop="destination">
          <el-input v-model="createForm.destination" placeholder="请输入目的地" />
        </el-form-item>
        <el-form-item label="出发时间" prop="departureTime">
          <el-date-picker
            v-model="createForm.departureTime"
            type="datetime"
            placeholder="选择出发时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="(date) => date < new Date()"
          />
        </el-form-item>
        <el-form-item label="座位数" prop="seats">
          <el-input-number v-model="createForm.seats" :min="1" :max="7" />
          <span class="unit-label">位 (不含司机)</span>
        </el-form-item>
        <el-form-item label="费用">
          <el-input-number v-model="createForm.cost" :min="0" :precision="2" />
          <span class="unit-label">元/人 (可填0表示免费)</span>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="3"
            placeholder="可填写车辆信息、路线说明等"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createCarpool" :loading="creating">发布</el-button>
      </template>
    </el-dialog>

    <!-- 加入拼车对话框 -->
    <el-dialog v-model="showJoinDialog" title="加入拼车" width="500px">
      <el-form ref="joinFormRef" :model="joinForm" label-width="100px">
        <el-form-item label="拼车信息">
          <div class="carpool-summary">
            <div class="route">
              {{ currentCarpool?.origin }} → {{ currentCarpool?.destination }}
            </div>
            <div class="time">{{ formatDateTime(currentCarpool?.departureTime) }}</div>
          </div>
        </el-form-item>
        <el-form-item label="上车地点" prop="pickupLocation">
          <el-input
            v-model="joinForm.pickupLocation"
            type="textarea"
            :rows="2"
            placeholder="请输入你的上车地点"
          />
        </el-form-item>
        <el-alert
          title="温馨提示"
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 10px"
        >
          请与车主确认上车地点和时间，感谢您的使用！
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmJoin" :loading="joining">确认加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Van, Plus, User, LocationFilled, Money, UserFilled } from '@element-plus/icons-vue'
import villageServicesApi from '@/api/villageServices'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const loading = ref(false)
const creating = ref(false)
const joining = ref(false)
const carpools = ref([])
const currentCarpool = ref(null)
const showCreateDialog = ref(false)
const showJoinDialog = ref(false)
const createFormRef = ref(null)
const joinFormRef = ref(null)

const filters = reactive({
  status: '',
  origin: '',
  destination: ''
})

const createForm = reactive({
  origin: '',
  destination: '',
  departureTime: '',
  seats: 4,
  cost: 0,
  notes: ''
})

const joinForm = reactive({
  pickupLocation: ''
})

const createRules = {
  origin: [{ required: true, message: '请输入出发地', trigger: 'blur' }],
  destination: [{ required: true, message: '请输入目的地', trigger: 'blur' }],
  departureTime: [{ required: true, message: '请选择出发时间', trigger: 'change' }],
  seats: [{ required: true, message: '请输入座位数', trigger: 'blur' }]
}

const joinRules = {
  pickupLocation: [{ required: true, message: '请输入上车地点', trigger: 'blur' }]
}

const getStatusLabel = (status) => {
  const labels = {
    open: '开放中',
    full: '已满员',
    completed: '已完成',
    cancelled: '已取消'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    open: 'success',
    full: 'warning',
    completed: 'info',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isMyCarpool = (carpool) => {
  return carpool.creator?._id === userStore.userId
}

const hasJoined = (carpool) => {
  return carpool.passengers?.some(p => p.userId._id === userStore.userId)
}

const fetchCarpools = async () => {
  loading.value = true
  try {
    const { data } = await villageServicesApi.getCarpoolRequests(filters)
    if (data.success) {
      carpools.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取拼车列表失败')
  } finally {
    loading.value = false
  }
}

const createCarpool = async () => {
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      creating.value = true
      try {
        const { data } = await villageServicesApi.createCarpoolRequest(createForm)
        if (data.success) {
          ElMessage.success('拼车发布成功')
          showCreateDialog.value = false
          resetCreateForm()
          fetchCarpools()
        }
      } catch (error) {
        ElMessage.error('发布拼车失败')
      } finally {
        creating.value = false
      }
    }
  })
}

const joinCarpool = (carpool) => {
  currentCarpool.value = carpool
  joinForm.pickupLocation = ''
  showJoinDialog.value = true
}

const confirmJoin = async () => {
  await joinFormRef.value.validate(async (valid) => {
    if (valid) {
      joining.value = true
      try {
        const { data } = await villageServicesApi.joinCarpool(currentCarpool.value._id, joinForm)
        if (data.success) {
          ElMessage.success('加入拼车成功')
          showJoinDialog.value = false
          fetchCarpools()
        }
      } catch (error) {
        ElMessage.error('加入拼车失败')
      } finally {
        joining.value = false
      }
    }
  })
}

const leaveCarpool = async (carpool) => {
  await ElMessageBox.confirm('确定要退出此拼车吗？', '确认退出', {
    type: 'warning'
  })
  ElMessage.success('已退出拼车')
  fetchCarpools()
}

const cancelCarpool = async (carpool) => {
  await ElMessageBox.confirm('确定要取消此拼车吗？所有乘客将收到通知', '确认取消', {
    type: 'warning'
  })
  ElMessage.success('拼车已取消')
  fetchCarpools()
}

const viewDetail = (carpool) => {
  currentCarpool.value = carpool
  ElMessage.info('查看拼车详情')
}

const resetCreateForm = () => {
  Object.assign(createForm, {
    origin: '',
    destination: '',
    departureTime: '',
    seats: 4,
    cost: 0,
    notes: ''
  })
  createFormRef.value?.resetFields()
}

onMounted(() => {
  fetchCarpools()
})
</script>

<style scoped>
.carpool-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.carpools-list {
  min-height: 400px;
}

.carpool-card {
  margin-bottom: 20px;
}

.carpool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.driver-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.carpool-time {
  font-size: 13px;
  color: #909399;
}

.carpool-route {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 15px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
}

.route-icon {
  font-size: 24px;
}

.route-point.origin .route-icon {
  color: #67c23a;
}

.route-point.destination .route-icon {
  color: #409eff;
}

.point-label {
  font-size: 12px;
  color: #909399;
}

.point-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.route-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #67c23a, #409eff);
  margin: 0 15px;
  position: relative;
}

.route-line::before {
  content: '→';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #f5f7fa;
  padding: 0 5px;
  color: #409eff;
}

.carpool-info {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.carpool-notes {
  margin-bottom: 15px;
}

.passengers-list {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 15px;
}

.passengers-label {
  font-size: 13px;
  color: #606266;
}

.carpool-actions {
  display: flex;
  gap: 10px;
}

.unit-label {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.carpool-summary {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.carpool-summary .route {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
}

.carpool-summary .time {
  font-size: 13px;
  color: #909399;
}
</style>
